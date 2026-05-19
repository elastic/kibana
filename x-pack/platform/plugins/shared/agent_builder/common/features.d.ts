export declare const AGENTBUILDER_FEATURE_ID = "agentBuilder";
export declare const AGENTBUILDER_FEATURE_NAME = "Agent Builder";
export declare const AGENTBUILDER_APP_ID = "agent_builder";
export declare const AGENTBUILDER_PATH = "/app/agent_builder";
export declare const AGENT_BUILDER_FULL_TITLE: string;
export declare const AGENT_BUILDER_SHORT_TITLE: string;
export declare const uiPrivileges: {
    /** Read access: view Agent Builder and read-only actions */
    show: string;
    /** Create/update/delete for areas not covered by sub-features. */
    write: string;
    manageAgents: string;
    manageTools: string;
    manageSkills: string;
};
export declare const apiPrivileges: {
    /** Access to GET APIs for areas not covered by sub-features. */
    readAgentBuilder: string;
    /** Access to POST/PUT/DELETE APIs for areas not covered by sub-features. */
    writeAgentBuilder: string;
    manageAgents: string;
    manageTools: string;
    manageSkills: string;
};
export declare const subFeaturePrivilegeIds: {
    readonly manageAgents: "manage_agents";
    readonly manageTools: "manage_tools";
    readonly manageSkills: "manage_skills";
};
