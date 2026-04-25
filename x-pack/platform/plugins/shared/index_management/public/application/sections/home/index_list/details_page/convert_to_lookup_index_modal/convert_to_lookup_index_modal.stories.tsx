/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Meta, StoryObj } from '@storybook/react';

import { ConvertToLookupIndexModal } from './convert_to_lookup_index_modal';

const meta: Meta<typeof ConvertToLookupIndexModal> = {
  component: ConvertToLookupIndexModal,
  title: 'Convert To Lookup Index Modal',
};

export default meta;
type Story = StoryObj<typeof ConvertToLookupIndexModal>;

export const Primary: Story = {
  args: {
    onCloseModal: () => {},
    onConvert: () => {},
    sourceIndexName: 'my-index',
    isConverting: false,
    errorMessage: '',
  },
};
