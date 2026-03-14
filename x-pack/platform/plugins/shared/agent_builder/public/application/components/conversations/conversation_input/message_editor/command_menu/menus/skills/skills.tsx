/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { forwardRef, useMemo } from 'react';
import type { CommandMenuComponentProps, CommandMenuHandle } from '../../types';
import { CommandMenuList } from '../components/command_menu_list';
import type { CommandMenuListOption } from '../components/command_menu_list';
import { useSkills } from './use_skills';

export const Skills = forwardRef<CommandMenuHandle, CommandMenuComponentProps>(
  ({ query, onSelect }, ref) => {
    const { skills, isLoading } = useSkills();

    const options: CommandMenuListOption[] = useMemo(() => {
      const lowerQuery = query.toLowerCase();
      return skills
        .filter((skill) => skill.name.toLowerCase().includes(lowerQuery))
        .map((skill) => ({ key: skill.id, label: skill.name }));
    }, [skills, query]);

    return (
      <CommandMenuList
        ref={ref}
        options={options}
        isLoading={isLoading}
        onSelect={onSelect}
        data-test-subj="skillsMenu"
      />
    );
  }
);
