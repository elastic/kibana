import { AxiosInstance } from 'axios';
import { getMultiCCKClient } from './client';

export interface CckPluginContract {
  getServers: () => Array<{ name: string; endpoint: string; elasticsearchRemoteName: string }>;
  getCCKClient: (name: string) => AxiosInstance;
  getMultiCCKClient: () => ReturnType<typeof getMultiCCKClient>;
}

export type CckPluginSetup = CckPluginContract;
export type CckPluginStart = CckPluginContract;
