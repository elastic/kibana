/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import awsIcon from '../../assets/icons/aws.svg';
import awsEc2Icon from '../../assets/icons/aws_ec2.svg';
import awsS3Icon from '../../assets/icons/aws_s3.svg';
import oktaIcon from '../../assets/icons/okta.svg';

const icons = {
  aws: awsIcon,
  aws_ec2: awsEc2Icon,
  aws_s3: awsS3Icon,
  okta: oktaIcon,
};

export function getSpanIcon(type?: string) {
  return icons[type ?? ''];
}
