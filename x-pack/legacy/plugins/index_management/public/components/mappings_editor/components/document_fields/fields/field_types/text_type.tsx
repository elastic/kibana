/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';

import { EditFieldSection, EditFieldFormRow } from '../edit_field';

export const TextType = () => {
  return (
    <>
      <EditFieldSection>
        <EditFieldFormRow title={<h3>Hello world</h3>} description="This is description text.">
          Content to be shown
        </EditFieldFormRow>
        <EditFieldFormRow withToggle={false}>
          This one has no toggle and no title and not description!
        </EditFieldFormRow>
        <EditFieldFormRow
          title={<h3>Form index</h3>}
          description="This is description text."
          direction="column"
          formFieldPath="index"
        >
          More Content to be shown below
        </EditFieldFormRow>
        <EditFieldFormRow title={<h3>Other prop</h3>}>Content to be shown</EditFieldFormRow>
      </EditFieldSection>
    </>
  );
};
