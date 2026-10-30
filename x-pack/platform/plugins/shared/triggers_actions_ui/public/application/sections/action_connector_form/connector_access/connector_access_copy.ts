/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { AccessCopy } from '@kbn/access-control-ui';

/**
 * Connector wording for the shared access panel: the `use` level means running the connector.
 */
export const CONNECTOR_ACCESS_COPY: AccessCopy = {
  objectNoun: i18n.translate('xpack.triggersActionsUI.connectorAccess.objectNoun', {
    defaultMessage: 'connector',
  }),
  generalAccess: {
    none: {
      label: i18n.translate('xpack.triggersActionsUI.connectorAccess.generalAccess.none', {
        defaultMessage: 'Only people with access',
      }),
      description: i18n.translate(
        'xpack.triggersActionsUI.connectorAccess.generalAccess.noneDescription',
        { defaultMessage: 'Only the owner and the people listed below can find and run it.' }
      ),
    },
    use: {
      label: i18n.translate('xpack.triggersActionsUI.connectorAccess.generalAccess.use', {
        defaultMessage: 'Everyone in this space can run',
      }),
      description: i18n.translate(
        'xpack.triggersActionsUI.connectorAccess.generalAccess.useDescription',
        {
          defaultMessage:
            'Everyone with connector privileges in this space can find and run it. Only the owner can edit it.',
        }
      ),
    },
    edit: {
      label: i18n.translate('xpack.triggersActionsUI.connectorAccess.generalAccess.edit', {
        defaultMessage: 'Everyone in this space can edit',
      }),
      description: i18n.translate(
        'xpack.triggersActionsUI.connectorAccess.generalAccess.editDescription',
        {
          defaultMessage:
            'Everyone with connector privileges in this space can find, run, and edit it.',
        }
      ),
    },
  },
  entryLevels: {
    use: {
      label: i18n.translate('xpack.triggersActionsUI.connectorAccess.entryLevel.use', {
        defaultMessage: 'Can run',
      }),
      description: '',
    },
  },
  operations: {
    view: i18n.translate('xpack.triggersActionsUI.connectorAccess.operation.view', {
      defaultMessage: 'View',
    }),
    use: i18n.translate('xpack.triggersActionsUI.connectorAccess.operation.use', {
      defaultMessage: 'Run and test',
    }),
    edit: i18n.translate('xpack.triggersActionsUI.connectorAccess.operation.edit', {
      defaultMessage: 'Edit',
    }),
    delete: i18n.translate('xpack.triggersActionsUI.connectorAccess.operation.delete', {
      defaultMessage: 'Delete',
    }),
  },
};
