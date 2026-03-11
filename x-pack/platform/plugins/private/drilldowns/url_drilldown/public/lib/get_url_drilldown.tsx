/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import type { SettingsStart } from '@kbn/core-ui-settings-browser';
import type { IExternalUrl, ThemeServiceStart } from '@kbn/core/public';
import {
  type ChartActionContext,
  type DrilldownDefinition,
  type DrilldownEditorProps,
} from '@kbn/embeddable-plugin/public';
import { i18n } from '@kbn/i18n';
import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import { getInheritedViewMode } from '@kbn/presentation-publishing';
import type { UrlTemplateEditorVariable } from '@kbn/kibana-react-plugin/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import {
  ON_OPEN_PANEL_MENU,
  ON_CLICK_IMAGE,
  ON_CLICK_ROW,
  ON_SELECT_RANGE,
  ON_CLICK_VALUE,
} from '@kbn/ui-actions-plugin/common/trigger_ids';
import type { UrlDrilldownConfig, UrlDrilldownGlobalScope } from './types';
import {
  DEFAULT_ENCODE_URL,
  DEFAULT_OPEN_IN_NEW_TAB,
  URL_DRILLDOWN_SUPPORTED_TRIGGERS,
} from '../../common/constants';
import type { UrlDrilldownState } from '../../server';
import { getEventScopeValues, getEventVariableList } from './variables/event_variables';
import { getContextScopeValues, getContextVariableList } from './variables/context_variables';
import { getGlobalVariableList } from './variables/global_variables';
import { UrlDrilldownCollectConfig } from './components/url_drilldown_collect_config';
import { validateUrlTemplate } from './url_validation';
import { compile } from './url_template';

type ExecutionContext = ChartActionContext & EmbeddableApiContext;
type SetupContext = EmbeddableApiContext;

export function getUrlDrilldown(deps: {
  externalUrl: IExternalUrl;
  getGlobalScope: () => UrlDrilldownGlobalScope;
  navigateToUrl: (url: string) => Promise<void>;
  getSyntaxHelpDocsLink: () => string;
  getVariablesHelpDocsLink: () => string;
  settings: SettingsStart;
  theme: () => ThemeServiceStart;
}): DrilldownDefinition<UrlDrilldownState, ExecutionContext, SetupContext> {
  function getRuntimeVariables(context: ExecutionContext) {
    return {
      event: getEventScopeValues(context),
      context: getContextScopeValues(context),
      ...deps.getGlobalScope(),
    };
  }

  async function getHref(
    drilldownState: UrlDrilldownState,
    context: ExecutionContext
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
    context: ExecutionContext
  ): Promise<string> {
    const scope = getRuntimeVariables(context);
    const { isValid, error, invalidUrl } = await validateUrlTemplate(drilldownState.url, scope);

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

    const url = await compile(drilldownState.url, getRuntimeVariables(context), doEncode);

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

  function getVariableList(context: SetupContext, trigger?: string): UrlTemplateEditorVariable[] {
    const eventVariables = getEventVariableList(trigger);
    const contextVariables = getContextVariableList(context);
    const globalVariables = getGlobalVariableList(deps.getGlobalScope());

    return [...eventVariables, ...contextVariables, ...globalVariables];
  }

  function getExampleUrl(trigger?: string): string {
    switch (trigger) {
      case ON_SELECT_RANGE:
        return 'https://www.example.com/?from={{event.from}}&to={{event.to}}';
      case ON_OPEN_PANEL_MENU:
      case ON_CLICK_IMAGE:
        return 'https://www.example.com/?panel={{context.panel.title}}';
      case ON_CLICK_ROW:
        return 'https://www.example.com/keys={{event.keys}}&values={{event.values}}';
      case ON_CLICK_VALUE:
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
      execute: async (drilldownState: UrlDrilldownState, context: ExecutionContext) => {
        const url = await getHref(drilldownState, context);
        if (!url) return;

        if (drilldownState.open_in_new_tab) {
          window.open(url, '_blank', 'noopener');
        } else {
          await deps.navigateToUrl(url);
        }
      },
      getHref,
      isCompatible: async (drilldownState: UrlDrilldownState, context: ExecutionContext) => {
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
    },
    setup: {
      Editor: (props: DrilldownEditorProps<UrlDrilldownState, SetupContext>) => {
        const { variables, exampleUrl, config } = useMemo(
          () => ({
            variables: getVariableList(props.context, props.state.trigger),
            exampleUrl: getExampleUrl(props.state.trigger),
            config: {
              url: {
                template: props.state.url ?? '',
              },
              encodeUrl: props.state.encode_url ?? DEFAULT_ENCODE_URL,
              openInNewTab: props.state.open_in_new_tab ?? DEFAULT_OPEN_IN_NEW_TAB,
            },
          }),
          [props]
        );

        const onConfigChange = useCallback(
          (nextConfig: UrlDrilldownConfig) => {
            props.onChange({
              ...props.state,
              encode_url: nextConfig.encodeUrl,
              open_in_new_tab: nextConfig.openInNewTab,
              url: nextConfig.url.template,
            });
          },
          [props]
        );

        return (
          <KibanaContextProvider
            services={{
              settings: deps.settings,
              theme: deps.theme(),
            }}
          >
            <UrlDrilldownCollectConfig
              variables={variables}
              exampleUrl={exampleUrl}
              config={config}
              onConfig={onConfigChange}
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
