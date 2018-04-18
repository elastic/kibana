import { IndexPatternCreationRegistry } from './index_pattern_creation';
import { IndexPatternCreationType } from './index_pattern_creation_type';

IndexPatternCreationRegistry.register(() => IndexPatternCreationType);
