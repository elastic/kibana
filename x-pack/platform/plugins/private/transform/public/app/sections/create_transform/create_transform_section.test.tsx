/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { SECTION_SLUG } from '../../common/constants';

import { CreateTransformSection } from './create_transform_section';

const mockWizard = jest.fn(() => null);

jest.mock('./components/wizard', () => ({
  Wizard: (props: unknown) => mockWizard(props),
}));

jest.mock('../../hooks/use_documentation_links', () => ({
  useDocumentationLinks: () => ({ esTransform: 'https://elastic.co/docs' }),
}));

jest.mock('../../components/capabilities_wrapper', () => ({
  CapabilitiesWrapper: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('../../services/navigation', () => ({
  breadcrumbService: { setBreadcrumbs: jest.fn() },
  docTitleService: { setTitle: jest.fn() },
  BREADCRUMB_SECTION: { CREATE_TRANSFORM: 'CREATE_TRANSFORM' },
}));

describe('CreateTransformSection', () => {
  beforeEach(() => {
    mockWizard.mockClear();
  });

  test('passes defaultSavedObjectId and pushes URL on selection', () => {
    const history = { push: jest.fn() };
    const match = {
      params: { savedObjectId: 'initial-source-id' },
      isExact: true,
      path: '/create_transform/:savedObjectId?',
      url: '/create_transform/initial-source-id',
    };

    render(
      <I18nProvider>
        <CreateTransformSection
          history={history as any}
          location={{} as any}
          match={match as any}
          staticContext={undefined}
        />
      </I18nProvider>
    );

    expect(mockWizard).toHaveBeenCalledTimes(1);
    const wizardProps = mockWizard.mock.calls[0][0] as {
      defaultSavedObjectId?: string;
      onSavedObjectSelected: (id: string) => void;
    };

    expect(wizardProps.defaultSavedObjectId).toBe('initial-source-id');

    wizardProps.onSavedObjectSelected('new-source-id');
    expect(history.push).toHaveBeenCalledWith(`/${SECTION_SLUG.CREATE_TRANSFORM}/new-source-id`);
  });
});

