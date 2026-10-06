/**
 * Whether Agent Builder has not generated the investigation conversation's title yet. An
 * investigation is created without a title (Agent Builder stores its placeholder), and Agent
 * Builder titles it from the first round; until then UIs show a fallback instead.
 */
export declare const isInvestigationTitlePending: (title: string | undefined) => boolean;
