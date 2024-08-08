import { generateOAS } from './generate.js';
import { writeFileSync } from 'fs';

const spec = generateOAS({ format: ".yaml" });
writeFileSync('oas.yaml', spec);
