/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRoot } from 'react-dom/client';
import { App } from './app.js';

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(<App />);
}
