/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import { i18n } from '@kbn/i18n';
import {
  AGENT_KNOWLEDGE_FEATURE_ID,
  AGENT_KNOWLEDGE_UI_CAPABILITY_MANAGE,
  AGENT_KNOWLEDGE_UI_CAPABILITY_SHOW,
} from '@kbn/agent-knowledge-common';
import {
  AGENT_KNOWLEDGE_API_PRIVILEGE_MANAGE,
  AGENT_KNOWLEDGE_API_PRIVILEGE_READ,
} from './constants';

export const registerFeatures = ({ features }: { features: FeaturesPluginSetup }) => {
  features.registerKibanaFeature({
    id: AGENT_KNOWLEDGE_FEATURE_ID,
    name: i18n.translate('xpack.agentKnowledge.featureName', {
      defaultMessage: 'Agent Knowledge',
    }),
    minimumLicense: 'enterprise',
    order: 3150,
    category: DEFAULT_APP_CATEGORIES.kibana,
    app: [],
    privileges: {
      all: {
        app: [],
        api: [AGENT_KNOWLEDGE_API_PRIVILEGE_READ, AGENT_KNOWLEDGE_API_PRIVILEGE_MANAGE],
        savedObject: { all: [], read: [] },
        ui: [AGENT_KNOWLEDGE_UI_CAPABILITY_SHOW, AGENT_KNOWLEDGE_UI_CAPABILITY_MANAGE],
      },
      read: {
        app: [],
        api: [AGENT_KNOWLEDGE_API_PRIVILEGE_READ],
        savedObject: { all: [], read: [] },
        ui: [AGENT_KNOWLEDGE_UI_CAPABILITY_SHOW],
      },
    },
  });
};
