/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InstallationType } from './installation';

export enum LanguageServerStatus {
  NOT_INSTALLED,
  INSTALLING,
  READY, // installed but not running
  RUNNING,
  LAUNCH_FAILED,
}

export interface LanguageServer {
  name: string;
  languages: string[];
  installationType: InstallationType;
  version?: string;
  build?: string;
  status?: LanguageServerStatus;
  downloadUrl?: any;
  pluginName?: string;
}

export const CTAGS_SUPPORT_LANGS = [
  'c',
  'cpp',
  'clojure',
  'csharp',
  'css',
  'go',
  'html',
  'ini',
  'lua',
  'json',
  'objective-c',
  'pascal',
  'perl',
  'php',
  'python',
  'r',
  'ruby',
  'rust',
  'scheme',
  'shell',
  'sql',
  'tcl',
  'typescript',
  'java',
  'javascript',
];
