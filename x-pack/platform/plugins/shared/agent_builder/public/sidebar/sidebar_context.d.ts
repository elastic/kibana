import { BehaviorSubject } from 'rxjs';
import type { CoreStart } from '@kbn/core/public';
import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import type { AgentBuilderInternalService } from '../services';
import type { OpenConversationSidebarOptions } from './types';
import type { EmbeddableConversationProps } from '../embeddable/types';
/**
 * Services set once at plugin start
 */
interface SidebarServices {
    coreStart: CoreStart;
    services: AgentBuilderInternalService;
}
export declare const sidebarServices$: BehaviorSubject<SidebarServices | null>;
/**
 * Set global services during plugin start.
 * These are needed by the sidebar component to render the conversation.
 */
export declare const setSidebarServices: (coreStart: CoreStart, services: AgentBuilderInternalService) => void;
/**
 * Runtime context set before each sidebar open
 */
export interface SidebarRuntimeContext {
    options: OpenConversationSidebarOptions;
    onClose?: () => void;
    onRegisterCallbacks?: (callbacks: {
        updateProps: (props: EmbeddableConversationProps) => void;
        resetBrowserApiTools: () => void;
        addAttachment: (attachment: AttachmentInput) => void;
    }) => void;
}
export declare const sidebarRuntimeContext$: BehaviorSubject<SidebarRuntimeContext | null>;
export declare const setSidebarRuntimeContext: (ctx: SidebarRuntimeContext) => void;
/**
 * Clear the runtime context. Call when closing the sidebar.
 */
export declare const clearSidebarRuntimeContext: () => void;
export {};
