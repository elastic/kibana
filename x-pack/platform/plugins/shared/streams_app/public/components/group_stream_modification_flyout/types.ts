/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiComboBoxOptionOption } from '@elastic/eui';

export interface GroupStreamFormData {
  name: string;
  description: string;
  owner: string;
  tier: string;
  metadata: Record<string, string>;
  tags: EuiComboBoxOptionOption[];
  runbookLinks: string[];
  documentationLinks: string[];
  repositoryLinks: string[];
  parent: EuiComboBoxOptionOption[];
  child: EuiComboBoxOptionOption[];
  dependency: EuiComboBoxOptionOption[];
  related: EuiComboBoxOptionOption[];
  dashboards: { id: string; title: string }[];
}

export interface TabProps {
  formData: GroupStreamFormData;
  setFormData: (formData: GroupStreamFormData) => void;
}
