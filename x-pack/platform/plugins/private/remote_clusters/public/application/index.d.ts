import type { CoreStart, ScopedHistory } from '@kbn/core/public';
import { type Context } from './app_context';
export declare const renderApp: (elem: Element, appDependencies: Context, history: ScopedHistory, startServices: CoreStart) => () => boolean;
