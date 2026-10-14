/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { CloudSetup } from '@kbn/cloud-plugin/server';
import { skills } from '@kbn/search-agent';

const VECTORDB_PROJECT_TYPE = 'vectordb';

/**
 * Registers the search skills from `@kbn/search-agent` for VectorDB projects.
 *
 * TODO: move search projects onto this plugin's registration, then delete the one in
 * `search_getting_started` and the project-type check below along with it.
 *
 * `search_getting_started` registers these same skills, but it belongs to the `search` group, so it
 * never loads in a VectorDB project and the skills would be missing there without this. The
 * project-type check stops the two from registering the same ids wherever both plugins do load:
 * serverless ES projects, which allow the `platform` and `search` groups, and stateful deployments,
 * which load every group. The skill service throws on a duplicate id, so setup would fail.
 */
export const registerSearchSkills = ({
  agentBuilder,
  cloud,
  logger,
}: {
  agentBuilder: AgentBuilderPluginSetup;
  cloud?: CloudSetup;
  logger: Logger;
}) => {
  if (cloud?.serverless.projectType !== VECTORDB_PROJECT_TYPE) {
    logger.debug(
      'Not running in a VectorDB project, skipping search skills registration in agent-builder'
    );
    return;
  }

  for (const skill of skills) {
    const id = `search.${skill.id}`;
    agentBuilder.skills.register({
      ...skill,
      id,
      basePath: 'skills/search',
    });
    logger.debug(`Successfully registered ${id} skill in agent-builder`);
  }
};
