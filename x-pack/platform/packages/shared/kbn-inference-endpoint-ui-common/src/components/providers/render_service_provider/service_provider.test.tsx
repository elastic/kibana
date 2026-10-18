/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import {
  SERVICE_PROVIDERS,
  ServiceProviderIcon,
  ServiceProviderName,
  getServiceProviderSearchableLabel,
} from './service_provider';
import { ServiceProviderKeys } from '../../../constants';

describe('ServiceProviderIcon component', () => {
  it('renders Hugging Face icon and name when providerKey is hugging_face', () => {
    render(<ServiceProviderIcon providerKey={ServiceProviderKeys.hugging_face} />);
    const avatar = screen.getByTestId('icon-service-provider-hugging_face');

    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveAttribute('aria-label', 'hugging_face');

    const icon = avatar.querySelector('[data-euiicon-type]');
    expect(icon).toBeInTheDocument();
  });

  it('renders Open AI icon when providerKey is openai', () => {
    render(<ServiceProviderIcon providerKey={ServiceProviderKeys.openai} />);

    const avatar = screen.getByTestId('icon-service-provider-openai');

    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveAttribute('aria-label', 'openai');

    const icon = avatar.querySelector('[data-euiicon-type]');
    expect(icon).toBeInTheDocument();
  });

  it('renders Default icon when providerKey is not present in SERVICE_PROVIDERS', () => {
    render(<ServiceProviderIcon providerKey={'brand-new-provider' as ServiceProviderKeys} />);

    const avatar = screen.getByTestId('icon-service-provider-brand-new-provider');

    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveAttribute('aria-label', 'brand-new-provider');

    const icon = avatar.querySelector('[data-euiicon-type]');
    expect(icon).toBeInTheDocument();
  });
});

describe('ServiceProviderName component', () => {
  it('renders Hugging Face icon and name when providerKey is hugging_face', () => {
    render(<ServiceProviderName providerKey={ServiceProviderKeys.hugging_face} />);
    expect(screen.getByText('Hugging Face')).toBeInTheDocument();
  });

  it('renders new provider name when providerKey is not present in SERVICE_PROVIDERS', () => {
    render(<ServiceProviderName providerKey={'brand-new-provider' as ServiceProviderKeys} />);
    expect(screen.getByText('brand-new-provider')).toBeInTheDocument();
  });
});

describe('getServiceProviderSearchableLabel', () => {
  it('includes the service key, display name and search aliases for openai', () => {
    const { name, searchAliases = [] } = SERVICE_PROVIDERS[ServiceProviderKeys.openai];
    const searchableLabel = getServiceProviderSearchableLabel(ServiceProviderKeys.openai);
    expect(searchableLabel).toContain(ServiceProviderKeys.openai);
    expect(searchableLabel).toContain(name);
    expect(searchAliases.length).toBeGreaterThan(0);
    searchAliases.forEach((alias) => expect(searchableLabel).toContain(alias));
  });

  it('includes the service key and display name for providers without aliases', () => {
    const { name } = SERVICE_PROVIDERS[ServiceProviderKeys.hugging_face];
    expect(getServiceProviderSearchableLabel(ServiceProviderKeys.hugging_face)).toBe(
      `${ServiceProviderKeys.hugging_face} ${name}`
    );
  });

  it('falls back to the provider key for unknown providers', () => {
    expect(getServiceProviderSearchableLabel('brand-new-provider')).toBe('brand-new-provider');
  });
});
