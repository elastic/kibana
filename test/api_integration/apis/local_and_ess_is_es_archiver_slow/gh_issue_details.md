Document es archiver load speed.

Metrics are needed for local, ess and serverless.

<details><summary>Systems Characteristics</summary>
<p>

50 executions per archive

### Instance Details

**Local**

- Mac OS X 13.4.1 (Ventura)
- os.arch -> arm64
- os.platform -> darwin
- os.totalmem -> 34.4 GB
- os.freemem -> 124.6 MB
- CPU Count -> 10

**ESS (cloud)**

- Version 8.8.1
- AWS - Paris (eu-west-3)
- 3 instances across 3 zones (eu-west-3a, eu-west-3b, eu-west-3c)
- KBN:
  - 1GB RAM

**Serverless (cloud)**

- Version 8.9.0
- AWS - Europe Central 1 (Frankfurt)
- 3 instances across 3 zones (eu-central-1a, eu-central-1b, eu-central-1c)
- KBN:
  - 1GB RAM

</p>
</details>

### x-pack/test/functional/es_archives/logstash_functional

|                            | Current es-archiver | highwater mark 5000 |
|----------------------------|---------------------|---------------------|
| LOCAL avg / min / max      | 4.7 / 4.5 / 5.0     | Cell                |
| ESS avg / min / max        | 29.4 / 24.1 / 71.9  | Cell                |
| SERVERLESS avg / min / max | 29.1 / 27.1 / 32.8  | 10.6 / 9.9 / 12.1   |

#### `logstash_functional` Meta

<details><summary>Archive Info</summary>
<p>
Field Count: ?

Doc Count: 4634 + 4757 + 4614 (3 indices) = 14_005

</p>
</details>

### test/functional/fixtures/es_archiver/many_fields

|                            | Current es-archiver | highwater mark 5000 |
|----------------------------|---------------------|---------------------|
| LOCAL avg / min / max      | 0.9 / 0.8 / 1.0     | Cell                |
| ESS avg / min / max        | 4.0 / 3.3 / 12.6    | Cell                |
| SERVERLESS avg / min / max | 2.8 / 2.5 / 3.2     | 3.0 / 2.8 / 3.4     |

#### `many_fields` Meta

<details><summary>Archive Info</summary>
<p>
Field Count: ?

Doc Count: 5_350

</p>
</details>

### x-pack/test/functional/es_archives/ml/farequote

|                            | Current es-archiver   | highwater mark 5000 |
|----------------------------|-----------------------|---------------------|
| LOCAL avg / min / max      | 9.5 / 8.5 / 13.2      | Cell                |
| ESS avg / min / max        | 76.1 / 47.6 / 612.8   | Cell                |
| SERVERLESS avg / min / max | 117.1 / 116.4 / 117.8 | 11.5 / 10.6 / 13.2  |

#### `farequote` Meta

<details><summary>Archive Info</summary>
<p>
Field Count: 6

Doc Count: 86_274

</p>
</details>
