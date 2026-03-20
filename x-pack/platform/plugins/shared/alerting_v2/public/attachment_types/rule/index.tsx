/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { ActionButtonType } from '@kbn/agent-builder-browser/attachments';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/public';
import type { HttpStart, ApplicationStart, NotificationsStart } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { RuleFormServices } from '@kbn/alerting-v2-rule-form';
import { RULE_TYPE, type RuleAttachment } from '../../../common/attachment_types';
import { MANAGEMENT_APP_ID, ALERTING_V2_MANAGEMENT_PATH } from '../../constants';
import { RuleInlineContent } from './inline_content';
import { RuleCanvasContent } from './canvas_content';
import { mapAttachmentToFormValues } from './map_attachment_to_form_values';

export const registerRuleAttachment = ({
  agentBuilder,
  http,
  data,
  dataViews,
  notifications,
  application,
}: {
  agentBuilder: AgentBuilderPluginStart;
  http: HttpStart;
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
  notifications: NotificationsStart;
  application: ApplicationStart;
}) => {
  const services: RuleFormServices = { http, data, dataViews, notifications, application };

  agentBuilder.attachments.addAttachmentType<RuleAttachment>(RULE_TYPE, {
    getLabel: (attachment) => attachment.data?.metadata?.name ?? 'Rule',
    getIcon: () => 'bell',
    renderInlineContent: (props) => <RuleInlineContent {...props} />,
    renderCanvasContent: (props, callbacks) => (
      <RuleCanvasContent {...props} services={services} closeCanvas={callbacks.closeCanvas} />
    ),
    getActionButtons: ({ attachment, openCanvas, isCanvas, openSidebarConversation }) => {
      if (isCanvas) {
        return [
          {
            label: i18n.translate('xpack.alertingVTwo.attachments.rule.editInManagementLabel', {
              defaultMessage: 'Edit in rule management',
            }),
            icon: 'popout',
            type: ActionButtonType.PRIMARY,
            handler: async () => {
              const formValues = mapAttachmentToFormValues(attachment.data);
              await application.navigateToApp(MANAGEMENT_APP_ID, {
                path: `${ALERTING_V2_MANAGEMENT_PATH}/create`,
                state: {
                  initialValues: formValues,
                  initialQuery: attachment.data.evaluation.query.base,
                },
              });
              openSidebarConversation?.();
            },
          },
        ];
      }

      const buttons = [];

      if (openCanvas) {
        buttons.push({
          label: i18n.translate('xpack.alertingVTwo.attachments.rule.previewActionLabel', {
            defaultMessage: 'Preview',
          }),
          icon: 'eye',
          type: ActionButtonType.SECONDARY,
          handler: () => openCanvas(),
        });
      }

      return buttons;
    },
  });
};
