/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, ReactNode } from 'react';
import React, { Suspense, lazy } from 'react';
import { render, screen } from '@testing-library/react';
import { z } from '@kbn/zod/v4';
import * as topLevelApp from '../../common/top_level_app';
import { withAttachmentProviders } from './with_providers';
import type { UnifiedReferenceAttachmentType, UnifiedReferenceAttachmentViewProps } from './types';

const SolutionContext = React.createContext('none');
const Providers: FC<{ children: ReactNode }> = ({ children }) => (
  <SolutionContext.Provider value="solution">{children}</SolutionContext.Provider>
);
const Renderer: FC = () => (
  <span data-test-subj="context">{React.useContext(SolutionContext)}</span>
);
const LazyRenderer = lazy(async () => ({ default: Renderer }));

const attachmentType: UnifiedReferenceAttachmentType = {
  id: 'solution.alert',
  schema: z.object({}),
  getIcon: () => 'bell',
  getLabel: () => 'Alert',
  getCreationActivity: () => ({ children: LazyRenderer }),
  getAttachmentList: () => ({ children: Renderer }),
  providers: Providers,
};

const renderActivity = (type: UnifiedReferenceAttachmentType) => {
  const { children: Children } = type.getCreationActivity(
    {} as UnifiedReferenceAttachmentViewProps
  );
  if (!Children) {
    throw new Error('expected a renderer');
  }
  return render(
    <Suspense fallback={null}>
      <Children {...({} as UnifiedReferenceAttachmentViewProps)} />
    </Suspense>
  );
};

describe('withAttachmentProviders', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns types without providers unchanged', () => {
    const { providers, ...withoutProviders } = attachmentType;
    expect(withAttachmentProviders(withoutProviders)).toBe(withoutProviders);
  });

  it('wraps renderers in the providers in the top-level app', async () => {
    jest.spyOn(topLevelApp, 'isTopLevelAppEnabled').mockReturnValue(true);
    renderActivity(withAttachmentProviders(attachmentType));

    expect(await screen.findByTestId('context')).toHaveTextContent('solution');
  });

  it('leaves renderers to the host app context when the top-level app is off', async () => {
    jest.spyOn(topLevelApp, 'isTopLevelAppEnabled').mockReturnValue(false);
    renderActivity(withAttachmentProviders(attachmentType));

    expect(await screen.findByTestId('context')).toHaveTextContent('none');
  });

  it('keeps wrapped renderers stable across calls so they do not remount', () => {
    const type = withAttachmentProviders(attachmentType);
    const props = {} as UnifiedReferenceAttachmentViewProps;

    const { children: firstActivity } = type.getCreationActivity(props);
    const { children: secondActivity } = type.getCreationActivity(props);
    const { children: firstList } = type.getAttachmentList?.() ?? {};
    const { children: secondList } = type.getAttachmentList?.() ?? {};

    expect(firstActivity).toBe(secondActivity);
    expect(firstList).toBe(secondList);
  });
});
