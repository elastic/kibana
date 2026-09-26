/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import { AnomalySwimlaneSeverityBadge } from './anomaly_swimlane_severity_badge';

const editableSwimlane = (threshold: number | undefined) => ({
  severityThreshold: new BehaviorSubject(threshold),
  onEdit: jest.fn(),
  getTypeDisplayName: () => 'Anomaly swim lane',
  isEditingEnabled: () => true,
});

describe('AnomalySwimlaneSeverityBadge', () => {
  const action = new AnomalySwimlaneSeverityBadge();

  it('is compatible only when the panel is editable and a severity floor is set', async () => {
    await expect(
      action.isCompatible({
        embeddable: editableSwimlane(50),
      } as any)
    ).resolves.toBe(true);

    await expect(
      action.isCompatible({
        embeddable: {
          severityThreshold: new BehaviorSubject(50),
        },
      } as any)
    ).resolves.toBe(false);

    await expect(
      action.isCompatible({
        embeddable: editableSwimlane(0),
      } as any)
    ).resolves.toBe(false);
  });
});
