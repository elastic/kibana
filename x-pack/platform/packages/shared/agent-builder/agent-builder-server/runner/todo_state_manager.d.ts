import type { TodoItem } from '@kbn/agent-builder-common/chat/conversation';
export interface TodoStateManager {
    set(todos: TodoItem[]): void;
    get(): TodoItem[] | undefined;
}
export declare const createTodoStateManager: (initial?: TodoItem[]) => TodoStateManager;
