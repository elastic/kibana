type RuleKind = 'alert' | 'signal';
/** EUI icon names for Alerting V2 rule kind badges. */
export declare const RULE_KIND_ICONS: {
    readonly alert: "bell";
    readonly signal: "radar";
};
export declare const RULE_KIND_LABELS: Record<RuleKind, string>;
export declare const RULE_KIND_TOOLTIPS: Record<RuleKind, string>;
export {};
