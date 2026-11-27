/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { SourceBadge } from './source_column';
import type { UnifiedHistorySource } from '../../../common/api/unified_history/types';

describe('SourceBadge', () => {
  it.each<UnifiedHistorySource>(['Live', 'Rule', 'Scheduled', 'Workflow'])(
    'renders the %s label',
    (source) => {
      render(<SourceBadge source={source} />);

      expect(screen.getByText(source)).toBeInTheDocument();
    }
  );

  describe('workflow verification', () => {
    it('should mark an unverified Workflow source', () => {
      render(<SourceBadge source="Workflow" originVerified={false} />);

      expect(screen.getByText('Workflow')).toBeInTheDocument();
      expect(screen.getByTestId('sourceBadgeWorkflowUnverified')).toBeInTheDocument();
    });

    it('should treat a Workflow source without a verification flag as unverified', () => {
      render(<SourceBadge source="Workflow" />);

      expect(screen.getByTestId('sourceBadgeWorkflowUnverified')).toBeInTheDocument();
    });

    it('should not mark a verified Workflow source', () => {
      render(<SourceBadge source="Workflow" originVerified />);

      expect(screen.getByText('Workflow')).toBeInTheDocument();
      expect(screen.queryByTestId('sourceBadgeWorkflowUnverified')).not.toBeInTheDocument();
    });

    it.each<UnifiedHistorySource>(['Live', 'Rule', 'Scheduled'])(
      'should not mark the %s source',
      (source) => {
        render(<SourceBadge source={source} />);

        expect(screen.queryByTestId('sourceBadgeWorkflowUnverified')).not.toBeInTheDocument();
      }
    );
  });
});
