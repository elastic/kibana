/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { TestEndpointModal } from '../all_inference_endpoints/render_table_columns/render_actions/actions/test_endpoint/test_endpoint_modal';

interface TestModelButtonProps {
  connectorId: string;
  label: string;
}

export const TestModelButton: React.FC<TestModelButtonProps> = ({ connectorId, label }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <EuiButtonEmpty
        size="xs"
        iconType="play"
        onClick={() => setIsModalOpen(true)}
        data-test-subj={`test-endpoint-${connectorId}`}
      >
        {i18n.translate('xpack.searchInferenceEndpoints.settings.testModel', {
          defaultMessage: 'Test',
        })}
      </EuiButtonEmpty>
      {isModalOpen && (
        <TestEndpointModal
          target={{ connectorId, connectorName: label }}
          taskType="chat_completion"
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  );
};
