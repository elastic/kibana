import { SkillsService } from "@kbn/agent-builder-server/runner";

export const skillInstructions = (skills: SkillsService): string => {
    const accessibleSkills = skills.list();
    const description =
        accessibleSkills.length === 0
            ? [
                "## SKILLS",
                "Load a skill to get detailed instructions for a specific task. No skills are currently available."
            ].join("\n")
            : [
                "## SKILLS",
                ["Load a skill to get detailed instructions for a specific task.",
                    "Skills provide specialized knowledge and step-by-step guidance.",
                    "Use this when a task matches an available skill's description.",
                    "Only the skills listed here are available:"].join(" "),
                "<available_skills>",
                ...accessibleSkills.flatMap((skill) => [
                    `    <skill id="${skill.id}" path="${skill.basePath}">`,
                    `      <name>${skill.name}</name>`,
                    `      <description>${skill.description}</description>`,
                    `    </skill>`,
                ]),
                "</available_skills>",
            ].join("\n")
    return description;
}