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
          Content to be shown on the right
        </EditFieldFormRow>

        <EditFieldFormRow title={<h3>Title is required</h3>} withToggle={false}>
          This one has no toggle and not description!
        </EditFieldFormRow>

        <EditFieldFormRow
          title={<h3>Form index</h3>}
          description="This is description text."
          direction="column"
          formFieldPath="index"
        >
          This one has the content shown below the toggle.
        </EditFieldFormRow>

        <EditFieldFormRow title={<h3>Other prop</h3>}>
          {isOn => (
            <>
              <div>Custom behaviour to control what is shown.</div>
              {isOn && <div>{`Hello I'm here!`}</div>}
            </>
          )}
        </EditFieldFormRow>
      </EditFieldSection>
    </>
  );
};
