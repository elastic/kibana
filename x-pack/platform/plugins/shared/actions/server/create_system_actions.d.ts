import type { ActionType } from '../common';
import type { InMemoryConnector } from './types';
export declare const createSystemConnectors: (actionTypes: ActionType[]) => InMemoryConnector[];
