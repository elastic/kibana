import React from 'react';

import {
  KuiPage,
} from '../../../../components/';

import InlineForm from './inline_form';
import InlineFormBad from './inline_form_bad';
import InlineFormSizing from './inline_form_sizing';
import InlineFormPopover from './inline_form_popover';

export default () => (

  <KuiPage>
    <InlineForm />
    <InlineFormSizing />
    <InlineFormPopover />
    <InlineFormBad />
  </KuiPage>
);
