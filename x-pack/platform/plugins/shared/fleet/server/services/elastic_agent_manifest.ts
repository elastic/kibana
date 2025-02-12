/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const elasticAgentStandaloneManifest = `---
# For more information refer https://www.elastic.co/guide/en/fleet/current/running-on-kubernetes-standalone.html
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: elastic-agent
  namespace: kube-system
  labels:
    app.kubernetes.io/name: elastic-agent
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: elastic-agent
  template:
    metadata:
      labels:
        app.kubernetes.io/name: elastic-agent
    spec:
      # Tolerations are needed to run Elastic Agent on Kubernetes control-plane nodes.
      # Agents running on control-plane nodes collect metrics from the control plane components (scheduler, controller manager) of Kubernetes
      tolerations:
        - key: node-role.kubernetes.io/control-plane
          effect: NoSchedule
        - key: node-role.kubernetes.io/master
          effect: NoSchedule
      serviceAccountName: elastic-agent
      hostNetwork: true
      dnsPolicy: ClusterFirstWithHostNet
      # Uncomment if using hints feature
      #initContainers:
      #  - name: k8s-templates-downloader
      #    image: docker.elastic.co/elastic-agent/elastic-agent:VERSION
      #    command: ['bash']
      #    args:
      #      - -c
      #      - >-
      #        mkdir -p /etc/elastic-agent/inputs.d &&
      #        curl -sL https://github.com/elastic/elastic-agent/archive/9.0.tar.gz | tar xz -C /etc/elastic-agent/inputs.d --strip=5 "elastic-agent-9.0/deploy/kubernetes/elastic-agent-standalone/templates.d"
      #    volumeMounts:
      #      - name: external-inputs
      #        mountPath: /etc/elastic-agent/inputs.d
      containers:
        - name: elastic-agent
          image: docker.elastic.co/elastic-agent/elastic-agent:VERSION
          args: ["-c", "/etc/elastic-agent/agent.yml", "-e"]
          env:
            # The API Key with access privilleges to connect to Elasticsearch. https://www.elastic.co/guide/en/fleet/current/grant-access-to-elasticsearch.html#create-api-key-standalone-agent
            - name: API_KEY
            # The basic authentication username used to connect to Elasticsearch. Alternative to API_KEY access.
            # This user needs the privileges required to publish events to Elasticsearch.
            - name: ES_USERNAME
              value: "elastic"
            # The basic authentication password used to connect to Elasticsearch
            - name: ES_PASSWORD
              value: "changeme"
            - name: NODE_NAME
              valueFrom:
                fieldRef:
                  fieldPath: spec.nodeName
            - name: POD_NAME
              valueFrom:
                fieldRef:
                  fieldPath: metadata.name
            # The following ELASTIC_NETINFO:false variable will disable the netinfo.enabled option of add-host-metadata processor. This will remove fields host.ip and host.mac.
            # For more info: https://www.elastic.co/guide/en/beats/metricbeat/current/add-host-metadata.html
            - name: ELASTIC_NETINFO
              value: "false"
          securityContext:
            runAsUser: 0
            # The following capabilities are needed for Universal Profiling.
            # More fine graded capabilities are only available for newer Linux kernels.
            # If you are using the Universal Profiling integration, please uncomment these lines before applying.
            #procMount: "Unmasked"
            #privileged: true
            #capabilities:
            #  add:
            #    - SYS_ADMIN
          resources:
            limits:
              memory: 1Gi
            requests:
              cpu: 100m
              memory: 500Mi
          volumeMounts:
            - name: datastreams
              mountPath: /etc/elastic-agent/agent.yml
              readOnly: true
              subPath: agent.yml
            - name: proc
              mountPath: /hostfs/proc
              readOnly: true
            - name: cgroup
              mountPath: /hostfs/sys/fs/cgroup
              readOnly: true
            - name: varlibdockercontainers
              mountPath: /var/lib/docker/containers
              readOnly: true
            - name: varlog
              mountPath: /var/log
              readOnly: true
            - name: etc-full
              mountPath: /hostfs/etc
              readOnly: true
            - name: var-lib
              mountPath: /hostfs/var/lib
              readOnly: true
            - name: sys-kernel-debug
              mountPath: /sys/kernel/debug
            - name: elastic-agent-state
              mountPath: /usr/share/elastic-agent/state
            # Uncomment if using hints feature
            # - name: external-inputs
            #   mountPath: /usr/share/elastic-agent/state/inputs.d
      volumes:
        - name: datastreams
          configMap:
            defaultMode: 0644
            name: agent-node-datastreams
        - name: proc
          hostPath:
            path: /proc
        - name: cgroup
          hostPath:
            path: /sys/fs/cgroup
        - name: varlibdockercontainers
          hostPath:
            path: /var/lib/docker/containers
        - name: varlog
          hostPath:
            path: /var/log
        # The following volumes are needed for Cloud Security Posture integration (cloudbeat)
        # If you are not using this integration, then these volumes and the corresponding
        # mounts can be removed.
        - name: etc-full
          hostPath:
            path: /etc
        - name: var-lib
          hostPath:
            path: /var/lib
        # Needed for Universal Profiling
        # If you are not using this integration, then these volumes and the corresponding
        # mounts can be removed.
        - name: sys-kernel-debug
          hostPath:
            path: /sys/kernel/debug
        # Mount /var/lib/elastic-agent-managed/kube-system/state to store elastic-agent state
        # Update 'kube-system' with the namespace of your agent installation
        - name: elastic-agent-state
          hostPath:
            path: /var/lib/elastic-agent/kube-system/state
            type: DirectoryOrCreate
        # Uncomment if using hints feature
        # - name: external-inputs
        #   emptyDir: {}
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: elastic-agent
subjects:
  - kind: ServiceAccount
    name: elastic-agent
    namespace: kube-system
roleRef:
  kind: ClusterRole
  name: elastic-agent
  apiGroup: rbac.authorization.k8s.io
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  namespace: kube-system
  name: elastic-agent
subjects:
  - kind: ServiceAccount
    name: elastic-agent
    namespace: kube-system
roleRef:
  kind: Role
  name: elastic-agent
  apiGroup: rbac.authorization.k8s.io
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: elastic-agent-kubeadm-config
  namespace: kube-system
subjects:
  - kind: ServiceAccount
    name: elastic-agent
    namespace: kube-system
roleRef:
  kind: Role
  name: elastic-agent-kubeadm-config
  apiGroup: rbac.authorization.k8s.io
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: elastic-agent
  labels:
    app.kubernetes.io/name: elastic-agent
rules:
  - apiGroups: [""]
    resources:
      - nodes
      - namespaces
      - events
      - pods
      - services
      - configmaps
      # Needed for cloudbeat
      - serviceaccounts
      - persistentvolumes
      - persistentvolumeclaims
    verbs: ["get", "list", "watch"]
  # Enable this rule only if planing to use kubernetes_secrets provider
  #- apiGroups: [""]
  #  resources:
  #  - secrets
  #  verbs: ["get"]
  - apiGroups: ["extensions"]
    resources:
      - replicasets
    verbs: ["get", "list", "watch"]
  - apiGroups: ["apps"]
    resources:
      - statefulsets
      - deployments
      - replicasets
      - daemonsets
    verbs: ["get", "list", "watch"]
  - apiGroups: ["batch"]
    resources:
      - jobs
      - cronjobs
    verbs: ["get", "list", "watch"]
  - apiGroups:
      - ""
    resources:
      - nodes/stats
    verbs:
      - get
  # Needed for apiserver
  - nonResourceURLs:
      - "/metrics"
    verbs:
      - get
  # Needed for cloudbeat
  - apiGroups: ["rbac.authorization.k8s.io"]
    resources:
      - clusterrolebindings
      - clusterroles
      - rolebindings
      - roles
    verbs: ["get", "list", "watch"]
  # Needed for cloudbeat
  - apiGroups: ["policy"]
    resources:
      - podsecuritypolicies
    verbs: ["get", "list", "watch"]
  - apiGroups: [ "storage.k8s.io" ]
    resources:
      - storageclasses
    verbs: [ "get", "list", "watch" ]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: elastic-agent
  # Should be the namespace where elastic-agent is running
  namespace: kube-system
  labels:
    app.kubernetes.io/name: elastic-agent
rules:
  - apiGroups:
      - coordination.k8s.io
    resources:
      - leases
    verbs: ["get", "create", "update"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: elastic-agent-kubeadm-config
  namespace: kube-system
  labels:
    app.kubernetes.io/name: elastic-agent
rules:
  - apiGroups: [""]
    resources:
      - configmaps
    resourceNames:
      - kubeadm-config
    verbs: ["get"]
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: elastic-agent
  namespace: kube-system
  labels:
    app.kubernetes.io/name: elastic-agent
---
`;

export const elasticAgentManagedManifest = `---
# For more information https://www.elastic.co/guide/en/fleet/current/running-on-kubernetes-managed-by-fleet.html
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: elastic-agent
  namespace: kube-system
  labels:
    app.kubernetes.io/name: elastic-agent
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: elastic-agent
  template:
    metadata:
      labels:
        app.kubernetes.io/name: elastic-agent
    spec:
      # Tolerations are needed to run Elastic Agent on Kubernetes control-plane nodes.
      # Agents running on control-plane nodes collect metrics from the control plane components (scheduler, controller manager) of Kubernetes
      tolerations:
        - key: node-role.kubernetes.io/control-plane
          effect: NoSchedule
        - key: node-role.kubernetes.io/master
          effect: NoSchedule
      serviceAccountName: elastic-agent
      hostNetwork: true
      dnsPolicy: ClusterFirstWithHostNet
      containers:
        - name: elastic-agent
          image: docker.elastic.co/elastic-agent/elastic-agent:VERSION
          env:
            # Set to 1 for enrollment into Fleet server. If not set, Elastic Agent is run in standalone mode
            - name: FLEET_ENROLL
              value: "1"
            # Set to true to communicate with Fleet with either insecure HTTP or unverified HTTPS
            - name: FLEET_INSECURE
              value: "false"
            # Fleet Server URL to enroll the Elastic Agent into
            # FLEET_URL can be found in Kibana, go to Management > Fleet > Settings
            - name: FLEET_URL
              value: "https://fleet-server:8220"
            # Elasticsearch API key used to enroll Elastic Agents in Fleet (https://www.elastic.co/guide/en/fleet/current/fleet-enrollment-tokens.html#fleet-enrollment-tokens)
            # If FLEET_ENROLLMENT_TOKEN is empty then KIBANA_HOST, KIBANA_FLEET_USERNAME, KIBANA_FLEET_PASSWORD are needed
            - name: FLEET_ENROLLMENT_TOKEN
              value: "token-id"
            - name: KIBANA_HOST
              value: "http://kibana:5601"
            # The basic authentication username used to connect to Kibana and retrieve a service_token to enable Fleet
            - name: KIBANA_FLEET_USERNAME
              value: "elastic"
            # The basic authentication password used to connect to Kibana and retrieve a service_token to enable Fleet
            - name: KIBANA_FLEET_PASSWORD
              value: "changeme"
            - name: NODE_NAME
              valueFrom:
                fieldRef:
                  fieldPath: spec.nodeName
            - name: POD_NAME
              valueFrom:
                fieldRef:
                  fieldPath: metadata.name
            # The following ELASTIC_NETINFO:false variable will disable the netinfo.enabled option of add-host-metadata processor. This will remove fields host.ip and host.mac.
            # For more info: https://www.elastic.co/guide/en/beats/metricbeat/current/add-host-metadata.html
            - name: ELASTIC_NETINFO
              value: "false"
          securityContext:
            runAsUser: 0
            # The following capabilities are needed for Universal Profiling.
            # More fine graded capabilities are only available for newer Linux kernels.
            # If you are using the Universal Profiling integration, please uncomment these lines before applying.
            #procMount: "Unmasked"
            #privileged: true
            #capabilities:
            #  add:
            #    - SYS_ADMIN
          resources:
            limits:
              memory: 1Gi
            requests:
              cpu: 100m
              memory: 500Mi
          volumeMounts:
            - name: proc
              mountPath: /hostfs/proc
              readOnly: true
            - name: cgroup
              mountPath: /hostfs/sys/fs/cgroup
              readOnly: true
            - name: varlibdockercontainers
              mountPath: /var/lib/docker/containers
              readOnly: true
            - name: varlog
              mountPath: /var/log
              readOnly: true
            - name: etc-full
              mountPath: /hostfs/etc
              readOnly: true
            - name: var-lib
              mountPath: /hostfs/var/lib
              readOnly: true
            - name: etc-mid
              mountPath: /etc/machine-id
              readOnly: true
            - name: sys-kernel-debug
              mountPath: /sys/kernel/debug
            - name: elastic-agent-state
              mountPath: /usr/share/elastic-agent/state
      volumes:
        - name: proc
          hostPath:
            path: /proc
        - name: cgroup
          hostPath:
            path: /sys/fs/cgroup
        - name: varlibdockercontainers
          hostPath:
            path: /var/lib/docker/containers
        - name: varlog
          hostPath:
            path: /var/log
        # The following volumes are needed for Cloud Security Posture integration (cloudbeat)
        # If you are not using this integration, then these volumes and the corresponding
        # mounts can be removed.
        - name: etc-full
          hostPath:
            path: /etc
        - name: var-lib
          hostPath:
            path: /var/lib
        # Mount /etc/machine-id from the host to determine host ID
        # Needed for Kubernetes node autodiscovery
        - name: etc-mid
          hostPath:
            path: /etc/machine-id
            type: File
        # Needed for Universal Profiling
        # If you are not using this integration, then these volumes and the corresponding
        # mounts can be removed.
        - name: sys-kernel-debug
          hostPath:
            path: /sys/kernel/debug
        # Mount /var/lib/elastic-agent-managed/kube-system/state to store elastic-agent state
        # Update 'kube-system' with the namespace of your agent installation
        - name: elastic-agent-state
          hostPath:
            path: /var/lib/elastic-agent-managed/kube-system/state
            type: DirectoryOrCreate
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: elastic-agent
subjects:
  - kind: ServiceAccount
    name: elastic-agent
    namespace: kube-system
roleRef:
  kind: ClusterRole
  name: elastic-agent
  apiGroup: rbac.authorization.k8s.io
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  namespace: kube-system
  name: elastic-agent
subjects:
  - kind: ServiceAccount
    name: elastic-agent
    namespace: kube-system
roleRef:
  kind: Role
  name: elastic-agent
  apiGroup: rbac.authorization.k8s.io
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: elastic-agent-kubeadm-config
  namespace: kube-system
subjects:
  - kind: ServiceAccount
    name: elastic-agent
    namespace: kube-system
roleRef:
  kind: Role
  name: elastic-agent-kubeadm-config
  apiGroup: rbac.authorization.k8s.io
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: elastic-agent
  labels:
    app.kubernetes.io/name: elastic-agent
rules:
  - apiGroups: [""]
    resources:
      - nodes
      - namespaces
      - events
      - pods
      - services
      - configmaps
      # Needed for cloudbeat
      - serviceaccounts
      - persistentvolumes
      - persistentvolumeclaims
    verbs: ["get", "list", "watch"]
  # Enable this rule only if planing to use kubernetes_secrets provider
  #- apiGroups: [""]
  #  resources:
  #  - secrets
  #  verbs: ["get"]
  - apiGroups: ["extensions"]
    resources:
      - replicasets
    verbs: ["get", "list", "watch"]
  - apiGroups: ["apps"]
    resources:
      - statefulsets
      - deployments
      - replicasets
      - daemonsets
    verbs: ["get", "list", "watch"]
  - apiGroups:
      - ""
    resources:
      - nodes/stats
    verbs:
      - get
  - apiGroups: [ "batch" ]
    resources:
      - jobs
      - cronjobs
    verbs: [ "get", "list", "watch" ]
  # Needed for apiserver
  - nonResourceURLs:
      - "/metrics"
    verbs:
      - get
  # Needed for cloudbeat
  - apiGroups: ["rbac.authorization.k8s.io"]
    resources:
      - clusterrolebindings
      - clusterroles
      - rolebindings
      - roles
    verbs: ["get", "list", "watch"]
  # Needed for cloudbeat
  - apiGroups: ["policy"]
    resources:
      - podsecuritypolicies
    verbs: ["get", "list", "watch"]
  - apiGroups: [ "storage.k8s.io" ]
    resources:
      - storageclasses
    verbs: [ "get", "list", "watch" ]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: elastic-agent
  # Should be the namespace where elastic-agent is running
  namespace: kube-system
  labels:
    app.kubernetes.io/name: elastic-agent
rules:
  - apiGroups:
      - coordination.k8s.io
    resources:
      - leases
    verbs: ["get", "create", "update"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: elastic-agent-kubeadm-config
  namespace: kube-system
  labels:
    app.kubernetes.io/name: elastic-agent
rules:
  - apiGroups: [""]
    resources:
      - configmaps
    resourceNames:
      - kubeadm-config
    verbs: ["get"]
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: elastic-agent
  namespace: kube-system
  labels:
    app.kubernetes.io/name: elastic-agent
---
`;
