/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import type { SettingsStart } from '@kbn/core-ui-settings-browser';
import type { IExternalUrl, ThemeServiceStart } from '@kbn/core/public';
import {
  CONTEXT_MENU_TRIGGER,
  SELECT_RANGE_TRIGGER,
  VALUE_CLICK_TRIGGER,
  type ChartActionContext,
  type DrilldownDefinition,
  type DrilldownEditorProps,
} from '@kbn/embeddable-plugin/public';
import { i18n } from '@kbn/i18n';
import type { UrlDrilldownGlobalScope } from '@kbn/ui-actions-enhanced-plugin/public';
import {
  urlDrilldownCompileUrl,
  urlDrilldownValidateUrlTemplate,
} from '@kbn/ui-actions-enhanced-plugin/public';
import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import { getInheritedViewMode } from '@kbn/presentation-publishing';
import { EuiText, EuiTextBlockTruncate } from '@elastic/eui';
import type { UrlTemplateEditorVariable } from '@kbn/kibana-react-plugin/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { IMAGE_CLICK_TRIGGER } from '@kbn/image-embeddable-plugin/common';
import { ROW_CLICK_TRIGGER } from '@kbn/ui-actions-browser';
import {
  DEFAULT_ENCODE_URL,
  DEFAULT_OPEN_IN_NEW_TAB,
  URL_DRILLDOWN_SUPPORTED_TRIGGERS,
} from '../../common/constants';
import type { UrlDrilldownState } from '../../server';
import { getEventScopeValues } from './variables/event_variables';
import { getContextScopeValues } from './variables/context_variables';
import { getGlobalVariableList } from './variables/global_variables';
import { UrlDrilldownEditor } from './editor';

type UrlDrilldownContext = ChartActionContext & EmbeddableApiContext;

export function getUrlDrilldown(deps: {
  externalUrl: IExternalUrl;
  getGlobalScope: () => UrlDrilldownGlobalScope;
  navigateToUrl: (url: string) => Promise<void>;
  getSyntaxHelpDocsLink: () => string;
  getVariablesHelpDocsLink: () => string;
  settings: SettingsStart;
  theme: () => ThemeServiceStart;
}): DrilldownDefinition<UrlDrilldownState, UrlDrilldownContext> {
  function getRuntimeVariables(context: ChartActionContext) {
    return {
      event: getEventScopeValues(context),
      context: getContextScopeValues(context),
      ...deps.getGlobalScope(),
    };
  }

  async function getHref(
    drilldownState: UrlDrilldownState,
    context: UrlDrilldownContext
  ): Promise<string | undefined> {
    try {
      const url = await buildUrl(drilldownState, context);
      return url;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn(e);
      return undefined;
    }
  }

  async function buildUrl(
    drilldownState: UrlDrilldownState,
    context: UrlDrilldownContext
  ): Promise<string> {
    const scope = getRuntimeVariables(context);
    const { isValid, error, invalidUrl } = await urlDrilldownValidateUrlTemplate(
      drilldownState.url,
      scope
    );

    if (!isValid) {
      const errorMessage = i18n.translate('xpack.urlDrilldown.invalidUrlErrorMessage', {
        defaultMessage:
          'Error building URL: {error} Use drilldown editor to check your URL template. Invalid URL: {invalidUrl}',
        values: {
          error,
          invalidUrl,
        },
      });
      throw new Error(errorMessage);
    }

    const doEncode = drilldownState.encode_url ?? DEFAULT_ENCODE_URL;

    const url = await urlDrilldownCompileUrl(
      drilldownState.url,
      getRuntimeVariables(context),
      doEncode
    );

    const validUrl = deps.externalUrl.validateUrl(url);
    if (!validUrl) {
      const errorMessage = i18n.translate('xpack.urlDrilldown.invalidUrlErrorMessage', {
        defaultMessage:
          'Error building URL: external URL was denied. Administrator can configure external URL policies using "externalUrl.policy" setting in kibana.yml. Invalid URL: {invalidUrl}',
        values: {
          invalidUrl: url,
        },
      });
      throw new Error(errorMessage);
    }

    return url;
  }

  function getVariableList(): UrlTemplateEditorVariable[] {
    // context: ActionFactoryContext
    // const eventVariables = getEventVariableList(context);
    // const contextVariables = getContextVariableList(context);
    const globalVariables = getGlobalVariableList(deps.getGlobalScope());

    // return [...eventVariables, ...contextVariables, ...globalVariables];
    return [...globalVariables];
  }

  function getExampleUrl(trigger?: string): string {
    switch (trigger) {
      case SELECT_RANGE_TRIGGER:
        return 'https://www.example.com/?from={{event.from}}&to={{event.to}}';
      case CONTEXT_MENU_TRIGGER:
      case IMAGE_CLICK_TRIGGER:
        return 'https://www.example.com/?panel={{context.panel.title}}';
      case ROW_CLICK_TRIGGER:
        return 'https://www.example.com/keys={{event.keys}}&values={{event.values}}';
      case VALUE_CLICK_TRIGGER:
      default:
        return 'https://www.example.com/?{{event.key}}={{event.value}}';
    }
  }

  return {
    displayName: i18n.translate('xpack.urlDrilldown.DisplayName', {
      defaultMessage: 'Go to URL',
    }),
    euiIcon: 'link',
    license: {
      minimalLicense: 'gold',
      featureName: 'URL drilldown',
    },
    supportedTriggers: URL_DRILLDOWN_SUPPORTED_TRIGGERS,
    action: {
      execute: async (drilldownState: UrlDrilldownState, context: UrlDrilldownContext) => {
        const url = await getHref(drilldownState, context);
        if (!url) return;

        if (drilldownState.open_in_new_tab) {
          window.open(url, '_blank', 'noopener');
        } else {
          await deps.navigateToUrl(url);
        }
      },
      getHref,
      isCompatible: async (drilldownState: UrlDrilldownState, context: UrlDrilldownContext) => {
        const viewMode = getInheritedViewMode(context.embeddable);
        if (viewMode === 'edit') {
          // check if context is compatible by building the scope
          const scope = getRuntimeVariables(context);
          return !!scope;
        }

        try {
          await buildUrl(drilldownState, context);
          return true;
        } catch (e) {
          // eslint-disable-next-line no-console
          console.warn(e);
          return false;
        }
      },
      MenuItem: ({ drilldownState, context }) => {
        const [title, setTitle] = React.useState(drilldownState.label);
        const [error, setError] = React.useState<string | undefined>();
        useEffect(() => {
          const variables = getRuntimeVariables(context);
          urlDrilldownCompileUrl(title, variables, false)
            .then((result) => {
              if (title !== result) setTitle(result);
            })
            .catch(() => {});

          // eslint-disable-next-line react-hooks/exhaustive-deps
        }, []);

        useEffect(() => {
          buildUrl(drilldownState, context).catch((e) => {
            setError(e.message);
          });
          // eslint-disable-next-line react-hooks/exhaustive-deps
        }, []);

        return (
          /* title is used as a tooltip, EuiToolTip doesn't work in this context menu due to hacky zIndex */
          <span title={error}>
            {title}
            {/* note: ideally we'd use EuiIconTip for the error, but it doesn't play well with this context menu*/}
            {error ? (
              <EuiText color={'danger'} size={'xs'}>
                <EuiTextBlockTruncate lines={3} data-test-subj={'urlDrilldown-error'}>
                  {error}
                </EuiTextBlockTruncate>
              </EuiText>
            ) : null}
          </span>
        );
      },
    },
    setup: {
      Editor: (props: DrilldownEditorProps<UrlDrilldownState>) => {
        const [variables, exampleUrl] = useMemo(
          () => [getVariableList(), getExampleUrl(props.state.trigger)],
          [props.state]
        );

        return (
          <KibanaContextProvider
            services={{
              settings: deps.settings,
              theme: deps.theme(),
            }}
          >
            <UrlDrilldownEditor
              {...props}
              variables={variables}
              exampleUrl={exampleUrl}
              syntaxHelpDocsLink={deps.getSyntaxHelpDocsLink()}
              variablesHelpDocsLink={deps.getVariablesHelpDocsLink()}
            />
          </KibanaContextProvider>
        );
      },
      getInitialState: () => ({
        open_in_new_tab: DEFAULT_OPEN_IN_NEW_TAB,
        encode_url: DEFAULT_ENCODE_URL,
      }),
      isStateValid: (state: Partial<UrlDrilldownState>) => {
        return Boolean(state.url);
      },
      order: 8,
    },
  };
}
