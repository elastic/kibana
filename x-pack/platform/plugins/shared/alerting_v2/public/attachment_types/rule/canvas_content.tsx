/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback } from 'react';
import { EuiPanel } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { StandaloneRuleForm } from '@kbn/alerting-v2-rule-form';
import type { RuleFormServices } from '@kbn/alerting-v2-rule-form';
import type {
  AttachmentRenderProps,
  CanvasRenderCallbacks,
} from '@kbn/agent-builder-browser/attachments';
import type { RuleAttachment } from '../../../common/attachment_types';
import { mapAttachmentToFormValues } from './map_attachment_to_form_values';

export interface RuleCanvasContentProps extends AttachmentRenderProps<RuleAttachment> {
  services: RuleFormServices;
  closeCanvas: CanvasRenderCallbacks['closeCanvas'];
}

export const RuleCanvasContent = ({
  attachment,
  services,
  closeCanvas,
}: RuleCanvasContentProps) => {
  const { data } = attachment;

  const initialValues = useMemo(() => mapAttachmentToFormValues(data), [data]);

  const onSuccess = useCallback(() => {
    closeCanvas();
  }, [closeCanvas]);

  const onCancel = useCallback(() => {
    closeCanvas();
  }, [closeCanvas]);

  return (
    <EuiPanel hasShadow={false} hasBorder={false}>
      <StandaloneRuleForm
        query={data.evaluation.query.base}
        services={services}
        layout="flyout"
        includeSubmission
        includeYaml
        onSuccess={onSuccess}
        onCancel={onCancel}
        initialValues={initialValues}
        submitLabel={
          <FormattedMessage
            id="xpack.alertingVTwo.attachments.rule.createRuleLabel"
            defaultMessage="Create rule"
          />
        }
        cancelLabel={
          <FormattedMessage
            id="xpack.alertingVTwo.attachments.rule.cancelLabel"
            defaultMessage="Cancel"
          />
        }
      />
    </EuiPanel>
  );
};
