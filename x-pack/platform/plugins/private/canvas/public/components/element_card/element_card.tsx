/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import type { EuiFlexItemProps } from '@elastic/eui';
import { EuiCard, EuiFlexItem, EuiIcon, transparentize, useEuiTheme } from '@elastic/eui';
import classNames from 'classnames';
import { TagList } from '../tag_list';

export interface Props {
  /**
   * name of the element
   */
  title: string;
  /**
   * description of the element
   */
  description: string;
  /**
   * preview image of the element
   */
  image?: string;
  /**
   * tags associated with the element
   */
  tags?: string[];
  /**
   * handler when clicking the card
   */
  onClick?: () => void;
}

const tagType = 'badge';

export const ElementCardWrapper: FC<PropsWithChildren<EuiFlexItemProps>> = ({
  children,
  className,
  ...rest
}) => {
  const { euiTheme } = useEuiTheme();
  const styles = useMemo(
    () => css`
      & .canvasElementCard__controls {
        background: ${transparentize(euiTheme.colors.plainLight, 0.5)};
      }
    `,
    [euiTheme]
  );

  return (
    <EuiFlexItem
      className={classNames('canvasElementCard__wrapper', className)}
      css={styles}
      {...rest}
    >
      {children}
    </EuiFlexItem>
  );
};

export const ElementCard = ({ title, description, image, tags = [], onClick, ...rest }: Props) => (
  <EuiCard
    className={image ? 'canvasElementCard' : 'canvasElementCard canvasElementCard--hasIcon'}
    textAlign="left"
    title={title}
    description={description}
    footer={<TagList tags={tags} tagType={tagType} />}
    image={image}
    icon={image ? undefined : <EuiIcon type="canvasApp" size="xxl" aria-hidden={true} />}
    onClick={onClick}
    {...rest}
  />
);
