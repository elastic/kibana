import { FileData } from "@kbn/langchain-deep-agent";
import { AgentEventEmitter } from "@kbn/onechat-server/agents";
import { createMiddleware } from "langchain";
import { formatSkillsDirectoryTree } from "../utils/skills_directory_tree";

/**
 * The purpose of this middleware is to provide a location that we can hook into
 * while converting the graph events to the OneChat events.
 *
 * We need to hook into the afterModel step to be able to extract the tool calls
 * from the last message and emit the corresponding OneChat events.
 *
 * Aside from that, this hook is a no-op.
 */
export const createSkillSystemPromptMiddleware = (events: AgentEventEmitter, skills: Record<string, FileData>) => {
    return createMiddleware({
        name: 'skillSystemPromptMiddleware',
        wrapModelCall: (request, handler) => {

            // convert skills to a system prompt.
            /**
             * Example format.
              /
                skills/
                    security/
                        get_alerts.md - Knowledge and guidance for retrieving, filtering, and analyzing security alerts in Elastic Security 
            */

            const formattedSkills = formatSkillsDirectoryTree(skills);
            const skillSystemPrompt = `## Agent Skills
In order to help achieve the highest-quality results possible, Elastic has compiled a set of "skills" which are essentially folders that contain a set of best practices for answering user questions. For instance, there is a skill that provides guidance on how to triage alerts. These skill folders have been heavily labored over and contain the condensed wisdom of a lot of trial and error working with LLMs to make really good, professional, outputs. Sometimes multiple skills may be required to get the best results, so one is not limited to just reading one.
            
Skills are stored in the filesystem. Here is an overview of the skills directory:
\n${formattedSkills}`;

            return handler({
                ...request,
                systemPrompt: (request.systemPrompt ? `${request.systemPrompt}\n\n` : "") + skillSystemPrompt
            })
        }
    });
};