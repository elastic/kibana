type ChatActionClickPayloadBase<TType extends ChatActionClickType, TExtraProps extends {}> = {
    type: TType;
} & TExtraProps;
type ChatActionClickPayloadExecuteEsql = ChatActionClickPayloadBase<ChatActionClickType.executeEsqlQuery | ChatActionClickType.visualizeEsqlQuery | ChatActionClickType.updateVisualization, {
    query: string;
    userOverrides?: unknown;
}>;
export type ChatActionClickPayload = ChatActionClickPayloadExecuteEsql;
export declare enum ChatActionClickType {
    executeEsqlQuery = "executeEsqlQuery",
    visualizeEsqlQuery = "visualizeEsqlQuery",
    updateVisualization = "updateVisualization"
}
export type ChatActionClickHandler = (payload: ChatActionClickPayload) => void;
export interface ChatFlyoutSecondSlotHandler {
    container?: HTMLDivElement | null;
    setVisibility?: (status: boolean) => void;
}
export {};
