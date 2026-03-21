import type { RouteSecurity } from '@kbn/core-http-server';
/**
 * Security configuration object for read-only access to Agent Builder APIs.
 */
export declare const AGENT_BUILDER_READ_SECURITY: RouteSecurity;
/**
 * Security configuration object for write access to Agent Builder APIs.
 */
export declare const AGENT_BUILDER_WRITE_SECURITY: RouteSecurity;
/**
 * Security configuration object for write access to agents.
 */
export declare const AGENTS_WRITE_SECURITY: RouteSecurity;
/**
 * Security configuration object for write access to tools.
 */
export declare const TOOLS_WRITE_SECURITY: RouteSecurity;
/**
 * Security configuration object for write access to skills.
 */
export declare const SKILLS_WRITE_SECURITY: RouteSecurity;
