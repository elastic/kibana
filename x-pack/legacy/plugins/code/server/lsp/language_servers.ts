/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InstallationType } from '../../common/installation';
import { CTAGS_SUPPORT_LANGS, LanguageServer } from '../../common/language_server';
import { ServerOptions } from '../server_options';
import { CtagsLauncher } from './ctags_launcher';
import { GoServerLauncher } from './go_launcher';
import { JavaLauncher } from './java_launcher';
import { LauncherConstructor } from './language_server_launcher';
import { TypescriptServerLauncher } from './ts_launcher';

export interface LanguageServerDefinition extends LanguageServer {
  builtinWorkspaceFolders: boolean;
  launcher: LauncherConstructor;
  installationFolderName?: string;
  downloadUrl?: (version: string, devMode?: boolean) => string;
  embedPath?: string;
  installationPluginName?: string;
  priority: number;
}

export const TYPESCRIPT: LanguageServerDefinition = {
  name: 'TypeScript',
  builtinWorkspaceFolders: false,
  languages: ['typescript', 'javascript'],
  launcher: TypescriptServerLauncher,
  installationType: InstallationType.Embed,
  embedPath: require.resolve('@elastic/javascript-typescript-langserver/lib/language-server.js'),
  priority: 2,
};
export const JAVA: LanguageServerDefinition = {
  name: 'Java',
  builtinWorkspaceFolders: true,
  languages: ['java'],
  launcher: JavaLauncher,
  installationType: InstallationType.Plugin,
  installationPluginName: 'java-langserver',
  installationFolderName: 'jdt',
  priority: 2,
  downloadUrl: (version: string, devMode?: boolean) =>
    devMode!
      ? `https://snapshots.elastic.co/downloads/kibana-plugins/java-langserver/java-langserver-${version}-SNAPSHOT-$OS.zip`
      : `https://artifacts.elastic.co/downloads/kibana-plugins/java-langserver/java-langserver-${version}-$OS.zip`,
};
export const GO: LanguageServerDefinition = {
  name: 'Go',
  builtinWorkspaceFolders: true,
  languages: ['go'],
  launcher: GoServerLauncher,
  installationType: InstallationType.Plugin,
  installationPluginName: 'go-langserver',
  priority: 2,
  installationFolderName: 'golsp',
  downloadUrl: (version: string, devMode?: boolean) =>
    devMode!
      ? `https://snapshots.elastic.co/downloads/kibana-plugins/go-langserver/go-langserver-${version}-SNAPSHOT-$OS.zip`
      : `https://artifacts.elastic.co/downloads/kibana-plugins/go-langserver/go-langserver-${version}-$OS.zip`,
};
export const CTAGS: LanguageServerDefinition = {
  name: 'Ctags',
  builtinWorkspaceFolders: true,
  languages: CTAGS_SUPPORT_LANGS,
  launcher: CtagsLauncher,
  installationType: InstallationType.Embed,
  embedPath: require.resolve('@elastic/ctags-langserver/lib/cli.js'),
  priority: 1,
};
export const LanguageServers: LanguageServerDefinition[] = [TYPESCRIPT, JAVA, GO, CTAGS];
export const LanguageServersDeveloping: LanguageServerDefinition[] = [];

export function enabledLanguageServers(serverOptions: ServerOptions) {
  const devMode: boolean = serverOptions.devMode;

  function isEnabled(lang: LanguageServerDefinition, defaultEnabled: boolean) {
    const name = lang.name;
    // @ts-ignore
    const enabled = serverOptions.lsp[name] && serverOptions.lsp[name].enabled;
    return enabled === undefined ? defaultEnabled : enabled;
  }
  const results = LanguageServers.filter(lang => isEnabled(lang, true));
  if (devMode) {
    return results.concat(LanguageServersDeveloping.filter(lang => isEnabled(lang, devMode)));
  }
  return results;
}
