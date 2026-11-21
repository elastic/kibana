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
});
