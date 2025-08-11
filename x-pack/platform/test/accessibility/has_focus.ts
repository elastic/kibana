/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TestSubjects } from '@kbn/ftr-common-functional-ui-services';
import { FindService } from '@kbn/ftr-common-functional-ui-services/services/find';

export const getHasFocus =
  (testSubjects: TestSubjects, find: FindService) => async (testSubject: string) => {
    const targetElement = await testSubjects.find(testSubject);
    const activeElement = await find.activeElement();
    return (await targetElement._webElement.getId()) === (await activeElement._webElement.getId());
  };
