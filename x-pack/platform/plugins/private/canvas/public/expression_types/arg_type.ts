/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { templateFromReactComponent } from '../lib/template_from_react_component';
import { BaseForm, BaseFormProps } from './base_form';

interface ArgTypeOwnProps {
  simpleTemplate: ReturnType<typeof templateFromReactComponent>;
  template?: ReturnType<typeof templateFromReactComponent>;
  default?: string;
  resolveArgValue?: boolean;
}

export type ArgTypeProps = ArgTypeOwnProps & BaseFormProps;

export class ArgType extends BaseForm {
  simpleTemplate: ReturnType<typeof templateFromReactComponent>;
  template?: ReturnType<typeof templateFromReactComponent>;
  default?: string;
  resolveArgValue: boolean;

  constructor(props: ArgTypeProps) {
    super(props);
    this.simpleTemplate = props.simpleTemplate;
    this.template = props.template;
    this.default = props.default;
    this.resolveArgValue = Boolean(props.resolveArgValue);
  }
}
