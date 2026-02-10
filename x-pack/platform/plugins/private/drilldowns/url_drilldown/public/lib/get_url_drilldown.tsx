/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { SettingsStart } from '@kbn/core-ui-settings-browser';
import type { IExternalUrl, ThemeServiceStart } from '@kbn/core/public';
import type {
  ChartActionContext,
  DrilldownDefinition,
  DrilldownEditorProps,
} from '@kbn/embeddable-plugin/public';
import { i18n } from '@kbn/i18n';
import type { UrlDrilldownGlobalScope } from '@kbn/ui-actions-enhanced-plugin/public';
import {
  urlDrilldownCompileUrl,
  urlDrilldownValidateUrlTemplate,
} from '@kbn/ui-actions-enhanced-plugin/public';
import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import { getInheritedViewMode } from '@kbn/presentation-publishing';
import {
  DEFAULT_ENCODE_URL,
  DEFAULT_OPEN_IN_NEW_TAB,
  URL_DRILLDOWN_SUPPORTED_TRIGGERS,
} from '../../common/constants';
import type { UrlDrilldownState } from '../../server';
import { getEventScopeValues } from './variables/event_variables';
import { getContextScopeValues } from './variables/context_variables';

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

  return {
    displayName: i18n.translate('xpack.urlDrilldown.DisplayName', {
      defaultMessage: 'Go to URL',
    }),
    Editor: (props: DrilldownEditorProps<UrlDrilldownState>) => {
      return <div>Editor placeholder</div>;
    },
    euiIcon: 'link',
    execute: async (drilldownState: UrlDrilldownState, context: UrlDrilldownContext) => {
      const url = await getHref(drilldownState, context);
      if (!url) return;

      if (drilldownState.open_in_new_tab) {
        window.open(url, '_blank', 'noopener');
      } else {
        await deps.navigateToUrl(url);
      }
    },
    getInitialState: () => ({
      open_in_new_tab: DEFAULT_OPEN_IN_NEW_TAB,
      encode_url: DEFAULT_ENCODE_URL,
    }),
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
    isStateValid: (state: Partial<UrlDrilldownState>) => {
      return Boolean(state.url);
    },
    license: {
      minimalLicense: 'gold',
      featureName: 'URL drilldown',
    },
    order: 8,
    supportedTriggers: URL_DRILLDOWN_SUPPORTED_TRIGGERS,
  } as DrilldownDefinition<UrlDrilldownState, UrlDrilldownContext>;
}
