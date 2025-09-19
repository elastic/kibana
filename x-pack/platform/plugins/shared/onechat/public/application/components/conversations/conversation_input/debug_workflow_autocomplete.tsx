/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFieldText, EuiFormRow, EuiSpacer, EuiText } from '@elastic/eui';
import React, { useState } from 'react';
import { useKibana } from '../../../hooks/use_kibana';
import { useOnechatServices } from '../../../hooks/use_onechat_service';

export const DebugWorkflowAutocomplete: React.FC = () => {
  const { startDependencies } = useOnechatServices();
  const { services: { http } } = useKibana();
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testAPI = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await http.get('/api/onechat/workflows/autocomplete', {
        query: { query, limit: 10 },
      });
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', margin: '10px' }}>
      <EuiText>
        <h3>Debug Workflow Autocomplete</h3>
      </EuiText>
      
      <EuiFormRow label="Query">
        <EuiFieldText
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter workflow search query"
        />
      </EuiFormRow>
      
      <EuiSpacer size="m" />
      
      <EuiButton onClick={testAPI} isLoading={loading}>
        Test API
      </EuiButton>
      
      <EuiSpacer size="m" />
      
      {error && (
        <EuiText color="danger">
          <strong>Error:</strong> {error}
        </EuiText>
      )}
      
      {result && (
        <div>
          <EuiText>
            <strong>Result:</strong>
          </EuiText>
          <pre style={{ background: '#f5f5f5', padding: '10px', fontSize: '12px' }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};
