# AESOP Security Implementation

## Overview

Multi-layer security implementation for AESOP (Autonomous Elastic Skill Optimization Platform) to prevent:
- Injection attacks (SQL, NoSQL, prompt injection)
- Unauthorized data modifications
- XSS vulnerabilities
- Resource exhaustion attacks

From paper Section 8: Threat Model - production security controls.

---

## Security Layers

### Layer 1: Input Sanitization

**File:** `input_sanitization.ts`

**Purpose:** Prevent injection attacks at input boundaries.

**Functions:**
- `sanitizeIndexPattern(pattern)` - Prevents ES query injection, shell injection, path traversal
- `sanitizeAgentRole(role)` - Prevents prompt injection in agent role descriptions
- `sanitizeSkillMarkdown(markdown)` - Prevents XSS in skill content
- `validateScopedIndices(indices)` - Validates array of index patterns (max 50)
- `validateExplorationDepth(depth)` - Validates numeric range (1-1000)
- `validateMinPatternFrequency(freq)` - Validates frequency parameter (1-1000)
- `redactPII(data)` - Redacts SSN, emails, credit cards, IPs before sending to LLM
- `validateTimeout(sec)` - Validates workflow timeout (60-7200 seconds)

**Test Coverage:**
- `input_sanitization.test.ts` - 100+ test cases for all injection vectors

**Example:**
```typescript
import { sanitizeIndexPattern, validateScopedIndices } from './security';

// Blocks malicious input
sanitizeIndexPattern('logs-*; rm -rf /'); // throws Error

// Validates safe input
const indices = validateScopedIndices(['logs-*', 'metrics-*']); // OK
```

---

### Layer 2: Read-Only Enforcement

**File:** `read_only_enforcer.ts`

**Purpose:** Ensure all Elasticsearch operations during exploration are read-only.

**Class:** `ReadOnlyEnforcer`

**Methods:**
- `validateReadOnlyRequest(method, path)` - Validates single ES request
- `validateReadOnlyRequests(requests)` - Validates batch of requests
- `wrapElasticsearchClient(client)` - Wraps ES client with automatic validation

**Allowed Operations:**
- GET requests (all paths)
- POST /_search, /_count, /_field_caps (read queries)
- POST /_async_search, /_msearch (async queries)

**Blocked Operations:**
- PUT, DELETE, PATCH (all paths)
- POST /_create, /_update, /_delete, /_bulk
- POST /_delete_by_query, /_update_by_query, /_reindex

**Test Coverage:**
- `read_only_enforcer.test.ts` - 30+ test cases for all HTTP methods

**Example:**
```typescript
import { ReadOnlyEnforcer } from './security';

const enforcer = new ReadOnlyEnforcer();

// Allowed
enforcer.validateReadOnlyRequest('POST', '/logs-*/_search'); // OK

// Blocked
enforcer.validateReadOnlyRequest('POST', '/_bulk'); // throws SecurityError
```

---

### Layer 3: Rate Limiting

**File:** `rate_limiter.ts`

**Purpose:** Prevent resource exhaustion by limiting operations per user.

**Class:** `RateLimiterService`

**Limits:**
- Exploration: 1 per hour (expensive, long-running)
- Validation: 10 per hour (moderate cost)
- Approval: 20 per hour (lightweight)

**Methods:**
- `checkRateLimit(userId, operation)` - Check and increment rate limit
- `getRateLimitStatus(userId, operation)` - Get status without incrementing
- `resetRateLimit(userId, operation)` - Admin override (testing)

**Algorithm:** Sliding window with automatic cleanup

**Test Coverage:**
- `rate_limiter.test.ts` - 20+ test cases for all operations

**Example:**
```typescript
import { RateLimiterService, DEFAULT_RATE_LIMITS } from './security';

const rateLimiter = new RateLimiterService(DEFAULT_RATE_LIMITS, logger);

const result = await rateLimiter.checkRateLimit('user1', 'exploration');
if (!result.allowed) {
  // Return 429 with Retry-After header
  console.log(`Try again in ${result.retryAfterSeconds} seconds`);
}
```

---

### Layer 4: XSS Prevention (Client-Side)

**File:** `public/lib/sanitize_markdown.ts`

**Purpose:** Defense-in-depth for browser-side rendering.

**Functions:**
- `sanitizeSkillMarkdown(markdown)` - Removes dangerous HTML/JS
- `sanitizePlainText(text)` - Escapes HTML entities
- `sanitizeFrontmatter(frontmatter)` - Validates YAML safety

**Removed:**
- `<script>`, `<iframe>`, `<object>`, `<embed>` tags
- Event handlers (onclick, onerror, etc.)
- Dangerous protocols (javascript:, data:)
- Code execution patterns in YAML (eval, require, import)

**Test Coverage:**
- `sanitize_markdown.test.ts` - 40+ test cases

**Example:**
```typescript
import { sanitizeSkillMarkdown } from './lib/sanitize_markdown';

const safe = sanitizeSkillMarkdown(userMarkdown);
// Now safe to render in React
```

---

## Integration with Routes

All AESOP routes enforce security layers:

### `/internal/aesop/exploration/run`
- Rate limiting: 1/hour
- Input sanitization: agent_role, scoped_indices, exploration_depth
- Read-only enforcement: All ES queries during exploration

### `/internal/aesop/skills/{skillId}/validate`
- Rate limiting: 10/hour
- Read-only enforcement: Validation queries

### `/internal/aesop/skills/{skillId}/approve`
- Rate limiting: 20/hour
- Markdown sanitization: Before deploying to Agent Builder

---

## Response Headers

Rate-limited responses include:

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 3600
X-RateLimit-Limit: 1
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 2026-03-22T14:30:00Z
```

---

## UI Components

**File:** `public/components/rate_limit_status.tsx`

**Components:**
- `<RateLimitStatus operation="exploration" lastResponse={resp} />` - Full badge with tooltip
- `<RateLimitStatusCompact operation="validation" lastResponse={resp} />` - Compact version

**Color Coding:**
- Green: >50% remaining
- Warning: 20-50% remaining
- Danger: <20% remaining

---

## Test Suite

**File:** `server/lib/aesop/security/__tests__/security_suite.test.ts`

Comprehensive integration tests covering:
- All injection vectors (SQL, NoSQL, shell, prompt, XSS)
- Read-only enforcement for all HTTP methods
- Rate limiting per user/operation
- PII redaction
- Multi-layer defense scenarios

**Run Tests:**
```bash
yarn test:jest --testPathPattern=security
```

---

## Security Checklist

Before deploying AESOP to production:

- [ ] Input sanitization enabled on all routes
- [ ] Read-only enforcer active during exploration
- [ ] Rate limiting configured per environment
- [ ] XSS sanitization in all React components
- [ ] PII redaction enabled for LLM context
- [ ] Security test suite passing (100%)
- [ ] Rate limit headers validated in UI
- [ ] Security logging enabled (warn on violations)

---

## Future Enhancements

1. **Persistent Rate Limiting** - Use Redis/Elasticsearch for distributed rate limiting
2. **Adaptive Limits** - Adjust based on user role/tier
3. **Anomaly Detection** - Flag unusual patterns (e.g., 10 approvals in 1 minute)
4. **Audit Logging** - Track all security violations to dedicated index
5. **RBAC Integration** - Fine-grained permissions per AESOP operation

---

## References

- AESOP Paper Section 8: Threat Model
- OWASP Top 10 2021
- Kibana Security Best Practices
- Elasticsearch Security Guidelines
