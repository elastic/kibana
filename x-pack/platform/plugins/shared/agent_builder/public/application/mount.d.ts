import type { CoreStart, ScopedHistory } from '@kbn/core/public';
import type { AgentBuilderInternalService } from '../services';
import type { AgentBuilderStartDependencies } from '../types';
import { type OnAppLeave } from './context/app_leave_context';
export declare const mountApp: ({ core, plugins, element, history, services, onAppLeave, }: {
    core: CoreStart;
    plugins: AgentBuilderStartDependencies;
    element: HTMLElement;
    history: ScopedHistory;
    services: AgentBuilderInternalService;
    onAppLeave: OnAppLeave;
}) => Promise<() => void>;
