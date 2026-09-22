/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  INVESTIGATION_COMPLETED_TRIGGER_ID,
  INVESTIGATION_FAILED_TRIGGER_ID,
  INVESTIGATION_STARTED_TRIGGER_ID,
  investigationCompletedTriggerCommonDefinition,
  investigationFailedTriggerCommonDefinition,
  investigationStartedTriggerCommonDefinition,
} from '.';

describe('investigation trigger documentation examples', () => {
  it('interpolates the started trigger id without wrapping YAML in i18n', () => {
    expect(investigationStartedTriggerCommonDefinition.documentation?.examples?.[0]).toContain(
      INVESTIGATION_STARTED_TRIGGER_ID
    );
  });

  it('interpolates the completed trigger id without wrapping YAML in i18n', () => {
    expect(investigationCompletedTriggerCommonDefinition.documentation?.examples?.[0]).toContain(
      INVESTIGATION_COMPLETED_TRIGGER_ID
    );
  });

  it('interpolates the failed trigger id without wrapping YAML in i18n', () => {
    expect(investigationFailedTriggerCommonDefinition.documentation?.examples?.[0]).toContain(
      INVESTIGATION_FAILED_TRIGGER_ID
    );
  });
});
