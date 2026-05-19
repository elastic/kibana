import { JoinEditor } from './join_editor';
declare const connectedJoinEditor: import("react-redux").ConnectedComponent<typeof JoinEditor, import("react-redux").Omit<import("./join_editor").Props, "onChange" | "joins">>;
export { connectedJoinEditor as JoinEditor };
export type { JoinField } from './join_editor';
