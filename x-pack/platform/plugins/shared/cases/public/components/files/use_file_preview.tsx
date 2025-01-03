/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from 'react';

export const useFilePreview = () => {
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);

  const closePreview = () => setIsPreviewVisible(false);
  const showPreview = () => setIsPreviewVisible(true);

  return { isPreviewVisible, showPreview, closePreview };
};
