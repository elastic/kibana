/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { IExternalUrl, ThemeServiceStart } from '@kbn/core/public';
import {
  type EmbeddableApiContext,
  getInheritedViewMode,
  apiCanAccessViewMode,
} from '@kbn/presentation-publishing';
import type { ChartActionContext } from '@kbn/embeddable-plugin/public';
import type { ActionExecutionContext } from '@kbn/ui-actions-plugin/public';
import {
  CONTEXT_MENU_TRIGGER,
  IMAGE_CLICK_TRIGGER,
  ROW_CLICK_TRIGGER,
  SELECT_RANGE_TRIGGER,
  VALUE_CLICK_TRIGGER,
} from '@kbn/ui-actions-plugin/common/trigger_ids';
import type { CollectConfigProps as CollectConfigPropsBase } from '@kbn/kibana-utils-plugin/public';
import type { UrlTemplateEditorVariable } from '@kbn/kibana-react-plugin/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type {
  UiActionsEnhancedBaseActionFactoryContext as BaseActionFactoryContext,
  UiActionsEnhancedDrilldownDefinition as Drilldown,
  UrlDrilldownConfig,
  UrlDrilldownGlobalScope,
} from '@kbn/ui-actions-enhanced-plugin/public';
import {
  UrlDrilldownCollectConfig,
  urlDrilldownCompileUrl,
  urlDrilldownValidateUrlTemplate,
} from '@kbn/ui-actions-enhanced-plugin/public';
import type { SerializedAction } from '@kbn/ui-actions-enhanced-plugin/common/types';
import type { SettingsStart } from '@kbn/core-ui-settings-browser';
import { EuiText, EuiTextBlockTruncate } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  DEFAULT_ENCODE_URL,
  DEFAULT_OPEN_IN_NEW_TAB,
  URL_DRILLDOWN_SUPPORTED_TRIGGERS,
} from '../../common/constants';
import { txtUrlDrilldownDisplayName } from './i18n';
import { getEventScopeValues, getEventVariableList } from './variables/event_variables';
import { getContextScopeValues, getContextVariableList } from './variables/context_variables';
import { getGlobalVariableList } from './variables/global_variables';

interface UrlDrilldownDeps {
  externalUrl: IExternalUrl;
  getGlobalScope: () => UrlDrilldownGlobalScope;
  navigateToUrl: (url: string) => Promise<void>;
  getSyntaxHelpDocsLink: () => string;
  getVariablesHelpDocsLink: () => string;
  settings: SettingsStart;
  theme: () => ThemeServiceStart;
}

export type Config = UrlDrilldownConfig;
export type UrlTrigger =
  | typeof VALUE_CLICK_TRIGGER
  | typeof SELECT_RANGE_TRIGGER
  | typeof ROW_CLICK_TRIGGER
  | typeof CONTEXT_MENU_TRIGGER
  | typeof IMAGE_CLICK_TRIGGER;

export type ActionFactoryContext = Partial<EmbeddableApiContext> & BaseActionFactoryContext;

export type CollectConfigProps = CollectConfigPropsBase<Config, ActionFactoryContext>;

const URL_DRILLDOWN = 'URL_DRILLDOWN';

const getViewMode = (context: ChartActionContext) => {
  if (apiCanAccessViewMode(context.embeddable)) {
    return getInheritedViewMode(context.embeddable);
  }
  throw new Error('Cannot access view mode');
};

export class UrlDrilldown implements Drilldown<Config, ChartActionContext, ActionFactoryContext> {
  public readonly id = URL_DRILLDOWN;

  constructor(private readonly deps: UrlDrilldownDeps) {}

  public readonly order = 8;

  readonly minimalLicense = 'gold';
  readonly licenseFeatureName = 'URL drilldown';

  public readonly getDisplayName = () => txtUrlDrilldownDisplayName;

  public readonly actionMenuItem: React.FC<{
    config: Omit<SerializedAction<UrlDrilldownConfig>, 'factoryId'>;
    context: ChartActionContext | ActionExecutionContext<ChartActionContext>;
  }> = ({ config, context }) => {
    const [title, setTitle] = React.useState(config.name);
    const [error, setError] = React.useState<string | undefined>();
    React.useEffect(() => {
      const variables = this.getRuntimeVariables(context);
      urlDrilldownCompileUrl(title, variables, false)
        .then((result) => {
          if (title !== result) setTitle(result);
        })
        .catch(() => {});

      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    React.useEffect(() => {
      this.buildUrl(config.config, context).catch((e) => {
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
  };

  public readonly euiIcon = 'link';

  supportedTriggers(): UrlTrigger[] {
    return URL_DRILLDOWN_SUPPORTED_TRIGGERS as UrlTrigger[];
  }
  public readonly CollectConfig: React.FC<CollectConfigProps> = ({ config, onConfig, context }) => {
    const [variables, exampleUrl] = React.useMemo(
      () => [this.getVariableList(context), this.getExampleUrl(context)],
      [context]
    );

    return (
      <KibanaContextProvider
        services={{
          settings: this.deps.settings,
          theme: this.deps.theme(),
        }}
      >
        <UrlDrilldownCollectConfig
          variables={variables}
          exampleUrl={exampleUrl}
          config={config}
          onConfig={onConfig}
          syntaxHelpDocsLink={this.deps.getSyntaxHelpDocsLink()}
          variablesHelpDocsLink={this.deps.getVariablesHelpDocsLink()}
        />
      </KibanaContextProvider>
    );
  };

  public readonly createConfig = () => ({
    url: {
      template: '',
    },
    openInNewTab: DEFAULT_OPEN_IN_NEW_TAB,
    encodeUrl: DEFAULT_ENCODE_URL,
  });

  public readonly isConfigValid = (config: Config): config is Config => {
    return !!config.url.template;
  };

  public readonly isCompatible = async (config: Config, context: ChartActionContext) => {
    const viewMode = getViewMode(context);

    if (viewMode === 'edit') {
      // check if context is compatible by building the scope
      const scope = this.getRuntimeVariables(context);
      return !!scope;
    }

    try {
      await this.buildUrl(config, context);
      return true;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn(e);
      return false;
    }
  };

  private async buildUrl(config: Config, context: ChartActionContext): Promise<string> {
    const scope = this.getRuntimeVariables(context);
    const { isValid, error, invalidUrl } = await urlDrilldownValidateUrlTemplate(config.url, scope);

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

    const doEncode = config.encodeUrl ?? DEFAULT_ENCODE_URL;

    const url = await urlDrilldownCompileUrl(
      config.url.template,
      this.getRuntimeVariables(context),
      doEncode
    );

    const validUrl = this.deps.externalUrl.validateUrl(url);
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

  public readonly getHref = async (
    config: Config,
    context: ChartActionContext
  ): Promise<string | undefined> => {
    try {
      const url = await this.buildUrl(config, context);
      return url;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn(e);
      return undefined;
    }
  };

  public readonly execute = async (config: Config, context: ChartActionContext) => {
    const url = await this.getHref(config, context);
    if (!url) return;

    if (config.openInNewTab) {
      window.open(url, '_blank', 'noopener');
    } else {
      await this.deps.navigateToUrl(url);
    }
  };

  public readonly getRuntimeVariables = (context: ChartActionContext) => {
    return {
      event: getEventScopeValues(context),
      context: getContextScopeValues(context),
      ...this.deps.getGlobalScope(),
    };
  };

  public readonly getVariableList = (
    context: ActionFactoryContext
  ): UrlTemplateEditorVariable[] => {
    const globalScopeValues = this.deps.getGlobalScope();
    const eventVariables = getEventVariableList(context);
    const contextVariables = getContextVariableList(context);
    const globalVariables = getGlobalVariableList(globalScopeValues);

    return [...eventVariables, ...contextVariables, ...globalVariables];
  };

  public readonly getExampleUrl = (context: ActionFactoryContext): string => {
    switch (context.triggers[0]) {
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
  };
}
