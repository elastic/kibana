import { AxiosInstance } from 'axios';
import { getMultiCCKClient } from './client';

export interface CckPluginContract {
  getServers: () => Array<{ name: string; endpoint: string }>;
  getCCKClient: (name: string) => AxiosInstance;
  getMultiCCKClient: (servers?: string[]) => CckMultiClient;
}

export type CckMultiClient = ReturnType<typeof getMultiCCKClient>;

export type CckPluginSetup = CckPluginContract;
export type CckPluginStart = CckPluginContract;
