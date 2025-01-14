/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import type { SavedObjectReference } from '@kbn/core/types';
import type { TagListComponentProps } from '@kbn/saved-objects-tagging-oss-plugin/public';
import type { Tag, TagWithOptionalId } from '../../../common/types';
import { getObjectTags } from '../../utils';
import { TagList } from '../base';
import type { ITagsCache } from '../../services';
import { byNameTagSorter } from '../../utils';

interface SavedObjectTagListProps {
  object: { references: SavedObjectReference[] };
  tags: Tag[];
  onClick?: (tag: TagWithOptionalId) => void;
  tagRender?: (tag: TagWithOptionalId) => JSX.Element;
}

const SavedObjectTagList: FC<SavedObjectTagListProps> = ({
  object,
  tags: allTags,
  onClick,
  tagRender,
}) => {
  const objectTags = useMemo(() => {
    const { tags } = getObjectTags(object, allTags);
    tags.sort(byNameTagSorter);
    return tags;
  }, [object, allTags]);

  return <TagList tags={objectTags} onClick={onClick} tagRender={tagRender} />;
};

interface GetConnectedTagListOptions {
  cache: ITagsCache;
}

export const getConnectedTagListComponent = ({
  cache,
}: GetConnectedTagListOptions): FC<TagListComponentProps> => {
  return (props: TagListComponentProps) => {
    const tags = useObservable(cache.getState$(), cache.getState());
    return <SavedObjectTagList {...props} tags={tags} />;
  };
};
