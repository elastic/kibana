/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { FormattedMessage, FormattedDate, FormattedTime } from '@kbn/i18n/react';

import { I18nContext } from 'ui/i18n';
import { npStart } from 'ui/new_platform';
import { management, MANAGEMENT_BREADCRUMB } from 'ui/management';

import { CoreStart } from '../../../../../src/core/public';
import { createUiStatsReporter } from '../../../../../src/legacy/core_plugins/ui_metric/public';

export interface I18n {
  [i18nPackage: string]: any;
  Context: typeof I18nContext;
  FormattedMessage: typeof FormattedMessage;
  FormattedDate: typeof FormattedDate;
  FormattedTime: typeof FormattedTime;
}

export interface Core extends CoreStart {
  __LEGACY: {
    i18n: I18n;
  };
}

export interface Plugins {
  __LEGACY: {
    management: {
      getSection: typeof management.getSection;
      constants: {
        BREADCRUMB: typeof MANAGEMENT_BREADCRUMB;
      };
    };
    uiMetric: {
      createUiStatsReporter: typeof createUiStatsReporter;
    };
  };
}

export function createShim(): { coreStart: Core; pluginsStart: Plugins } {
  return {
    coreStart: {
      ...npStart.core,
      __LEGACY: {
        i18n: {
          ...i18n,
          Context: I18nContext,
          FormattedMessage,
          FormattedDate,
          FormattedTime,
        },
      },
    },
    pluginsStart: {
      ...npStart.plugins,
      __LEGACY: {
        management: {
          getSection: management.getSection.bind(management),
          constants: {
            BREADCRUMB: MANAGEMENT_BREADCRUMB,
          },
        },
        uiMetric: {
          createUiStatsReporter,
        },
      },
    },
  };
}
