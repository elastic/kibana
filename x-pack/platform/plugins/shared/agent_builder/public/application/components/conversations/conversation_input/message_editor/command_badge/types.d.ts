import type { CommandId } from '../command_menu/types';
export interface CommandBadgeData {
    readonly commandId: CommandId;
    readonly label: string;
    readonly id: string;
    readonly metadata: Record<string, string> & {
        id?: never;
    };
}
