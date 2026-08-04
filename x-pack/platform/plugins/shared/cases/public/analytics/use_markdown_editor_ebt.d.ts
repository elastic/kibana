export type MarkdownEditorPluginType = 'lens' | 'timeline';
/**
 * Events Based Tracking for clicking a markdown editor plugin (lens or timeline)
 */
export declare const useMarkdownEditorPluginClickedEBT: () => (pluginType: MarkdownEditorPluginType) => void;
