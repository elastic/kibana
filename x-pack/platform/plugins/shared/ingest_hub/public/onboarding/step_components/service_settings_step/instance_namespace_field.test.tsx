/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => ({ services: { docLinks: undefined } }),
}));
jest.mock('@kbn/fleet-plugin/public', () => ({
  NamespaceComboBox: ({
    namespace,
    validationError,
    onNamespaceChange,
    'data-test-subj': dataTestSubj,
  }: {
    namespace?: string;
    validationError?: string[] | null;
    onNamespaceChange: (ns: string) => void;
    'data-test-subj'?: string;
  }) => (
    <div>
      <input
        data-test-subj={dataTestSubj}
        value={namespace ?? ''}
        onChange={(e) => onNamespaceChange(e.target.value)}
      />
      {validationError?.map((e) => (
        <span key={e} data-test-subj="namespaceError">
          {e}
        </span>
      ))}
    </div>
  ),
}));

import { InstanceNamespaceField, getNamespaceError } from './instance_namespace_field';

function renderField(props: Partial<React.ComponentProps<typeof InstanceNamespaceField>> = {}) {
  const onChange = jest.fn();
  render(
    <I18nProvider>
      <InstanceNamespaceField namespace="" onChange={onChange} {...props} />
    </I18nProvider>
  );
  return { onChange };
}

describe('getNamespaceError', () => {
  it('accepts an empty namespace so the policy inherits one', () => {
    expect(getNamespaceError('')).toBeUndefined();
  });

  it('rejects an uppercase namespace', () => {
    expect(getNamespaceError('Prod')).toBe('Namespace must be lowercase');
  });

  it('rejects a hyphenated namespace', () => {
    expect(getNamespaceError('prod-eu')).toBe('Namespace contains invalid characters');
  });
});

describe('InstanceNamespaceField', () => {
  it('reports the typed namespace', () => {
    const { onChange } = renderField();
    fireEvent.change(screen.getByTestId('serviceSettings-namespaceField'), {
      target: { value: 'prod' },
    });
    expect(onChange).toHaveBeenCalledWith('prod');
  });

  it('shows the validation error for an invalid namespace', () => {
    renderField({ namespace: 'Prod' });
    expect(screen.getByTestId('namespaceError')).toHaveTextContent('Namespace must be lowercase');
  });

  it('renders a read-only value once the instance is deployed', () => {
    renderField({ namespace: 'prod', isLocked: true });
    expect(screen.getByTestId('serviceSettings-namespaceField-locked')).toBeDisabled();
    expect(screen.getByTestId('serviceSettings-namespaceField-locked')).toHaveValue('prod');
  });

  it('says the namespace is inherited when locked with no namespace', () => {
    renderField({ namespace: '', isLocked: true });
    expect(screen.getByTestId('serviceSettings-namespaceField-locked')).toHaveAttribute(
      'placeholder',
      'Inherited from the agent policy'
    );
  });
});
